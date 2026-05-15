// web-dashboard/app/api/nodes/ping/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { queueStatusUpdate } from '@/lib/batchUpdater';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ✂️ liveStatus yahan se hata diya
    const { hardwareId, hostname, currentPort, isExecuting } = body;

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
      // ✂️ Naye registration mein bhi liveStatus nahi banega
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
              lastSeen: currentTime 
            }
        }
      });
      return NextResponse.json({ success: true, message: "Registered.", status: "pending" }, { status: 201 });
    } 
    else {
      // THE GATEKEEPER: Max Instances Limit Check
      const maxInstances = existingDevice.maxInstances || 3;
      const liveMetrics = existingDevice.liveMetrics || {};

      let activePortsCount = 0;
      let isCurrentPortAlreadyActive = false;

      for (const [port, data] of Object.entries(liveMetrics)) {
        const portData = data as any;
        if (portData && portData.lastSeen) {
          const lastSeenTime = new Date(portData.lastSeen).getTime();
          if (now - lastSeenTime < 60000) {
            activePortsCount++;
            if (port === String(currentPort)) {
              isCurrentPortAlreadyActive = true;
            }
          }
        }
      }

      if (!isCurrentPortAlreadyActive && activePortsCount >= maxInstances) {
        return NextResponse.json({ success: false, error: "LIMIT_REACHED", max: maxInstances }, { status: 403 });
      }

      // ✂️ Sirf Zaroori Data Update Hoga (No Live Status)
      const updateData: any = {
        lastSeen: currentTime,
        hostname: hostname || existingDevice.hostname,
        [`liveMetrics.${currentPort}.lastSeen`]: currentTime
      };

      if (isExecuting !== undefined) {
        updateData[`liveMetrics.${currentPort}.isExecuting`] = isExecuting;
      }

      const myCommand = existingDevice.pendingCommands?.[currentPort];
      const hasStopSafety = existingDevice.pendingCommands?.[currentPort] === "STOP" && !isExecuting;

      if (myCommand || hasStopSafety) {
          const updateQuery: any = { 
              $set: updateData, 
              $unset: { [`pendingCommands.${currentPort}`]: "" } 
          };
          await devicesCollection.updateOne({ hardwareId }, updateQuery);
      } else {
          queueStatusUpdate(hardwareId, updateData);
      }

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
        pendingCommand: myCommand || null 
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error("Ping Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}