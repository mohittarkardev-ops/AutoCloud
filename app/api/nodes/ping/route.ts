// web-dashboard/app/api/nodes/ping/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { queueStatusUpdate } from '@/lib/batchUpdater'; // 👈 NAYA IMPORT (Memory Queue)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { hardwareId, hostname, currentPort, isExecuting, liveStatus } = body;

    if (!hardwareId || !currentPort) {
      return NextResponse.json({ success: false, error: 'Hardware ID and Port required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("automation_db");
    const devicesCollection = db.collection("devices");
    const workflowsCollection = db.collection("workflows");
    const currentTime = new Date();
    const now = currentTime.getTime();

    const existingDevice = await devicesCollection.findOne({ hardwareId });

    if (!existingDevice) {
      // Naya Registration (Pehli baar open hone par limit check ki zaroorat nahi)
      await devicesCollection.insertOne({
        hardwareId, 
        hostname: hostname || "Unknown PC", 
        alias: "New Unassigned PC",
        status: "pending", 
        maxInstances: 3, 
        assignedWorkflow: null, 
        pendingCommands: {},
        lastSeen: currentTime, 
        createdAt: currentTime,
        liveMetrics: { 
            [currentPort]: { 
              isExecuting: isExecuting || false, 
              currentStatus: liveStatus || { currentStep: "Idle", progress: 0 }, 
              lastSeen: currentTime 
            }
        }
      });
      return NextResponse.json({ success: true, message: "Registered.", status: "pending" }, { status: 201 });
    } 
    else {
      // 🔴 THE GATEKEEPER: Max Instances Limit Check
      const maxInstances = existingDevice.maxInstances || 3;
      const liveMetrics = existingDevice.liveMetrics || {};

      let activePortsCount = 0;
      let isCurrentPortAlreadyActive = false;

      // Puraane aur naye sabhi ports ko check karo ki kitne "Zinda" (Active) hain
      for (const [port, data] of Object.entries(liveMetrics)) {
        const portData = data as any;
        if (portData && portData.lastSeen) {
          const lastSeenTime = new Date(portData.lastSeen).getTime();
          // Agar port ne pichle 60 seconds mein kuch bola hai, matlab wo active hai
          if (now - lastSeenTime < 60000) {
            activePortsCount++;
            if (port === String(currentPort)) {
              isCurrentPortAlreadyActive = true;
            }
          }
        }
      }

      // Agar ye ek NAYA port hai aur Limit cross ho rahi hai -> REJECT ENTRY!
      if (!isCurrentPortAlreadyActive && activePortsCount >= maxInstances) {
        console.log(`[BLOCKED] ${hardwareId} tried to open port ${currentPort}. Max Limit (${maxInstances}) reached.`);
        return NextResponse.json({
          success: false,
          error: "LIMIT_REACHED",
          max: maxInstances
        }, { status: 403 }); // 403 Forbidden
      }

      // 🔴 THE MAGIC: Sirf wahi data update karo jo actually aaya hai (Undefined Bypass)
      const updateData: any = {
        lastSeen: currentTime,
        hostname: hostname || existingDevice.hostname,
        [`liveMetrics.${currentPort}.lastSeen`]: currentTime // Har port ka apna online status
      };

      if (isExecuting !== undefined) {
        updateData[`liveMetrics.${currentPort}.isExecuting`] = isExecuting;
      }
      if (liveStatus !== undefined) {
        updateData[`liveMetrics.${currentPort}.currentStatus`] = liveStatus || existingDevice.liveMetrics?.[currentPort]?.currentStatus;
      }

      // 🔴 COMMAND FETCH & HYBRID ROUTER
      const myCommand = existingDevice.pendingCommands?.[currentPort];
      const hasStopSafety = existingDevice.pendingCommands?.[currentPort] === "STOP" && !isExecuting;

      if (myCommand || hasStopSafety) {
          // CASE 1: Agar koi command deni hai, to use INSTANT database mein update karo 
          // taaki command 2 baar na chali jaye (Race Condition fix)
          const updateQuery: any = { 
              $set: updateData, 
              $unset: { [`pendingCommands.${currentPort}`]: "" } 
          };
          await devicesCollection.updateOne({ hardwareId }, updateQuery);
          
          if (myCommand) {
              console.log(`Command [${myCommand}] delivered to ${hardwareId}:${currentPort} (Instant DB Hit)`);
          }
      } else {
          // CASE 2: Normal Ping (99% traffic). Isko direct RAM (Memory Queue) mein bhej do! (Zero DB Load)
          queueStatusUpdate(hardwareId, updateData);
      }

      // Workflow fetch (Bypass if no ID assigned to save Reads)
      let fullWorkflowData = existingDevice.assignedWorkflow;
      if (fullWorkflowData && fullWorkflowData.id) {
        try {
          const actualWorkflow = await workflowsCollection.findOne({ _id: new ObjectId(fullWorkflowData.id) });
          if (actualWorkflow) fullWorkflowData = actualWorkflow; 
        } catch (e) { console.error("Workflow error:", e); }
      }

      return NextResponse.json({
        success: true, 
        status: existingDevice.status, 
        assignedFlow: fullWorkflowData, 
        pendingCommand: myCommand || null // 🔴 Python ko sirf uski command milegi
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error("Ping Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}