const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors()); 
app.use(express.json());

const uri = "mongodb+srv://2201884_db_user:ciSMGiYTbhW13NkR@cluster0.wjuhsil.mongodb.net/?appName=Cluster0";
   const client = new MongoClient(uri);
let database;

async function connectDB() {
    try {
        await client.connect();
        database = client.db("Bill");
        console.log("Database connected successfully.");
    } catch (err) {
        console.error("Database connection failed:", err);
    }
}
connectDB();


// ==========================================
// STUDENT CRUD ROUTES
// ==========================================

app.get('/api/students', async (req, res) => {
    try {
        const collection = database.collection("Tracker_Students"); 
        const students = await collection.find({}).toArray();
        res.json(students);
    } catch (error) {
        console.error("[SERVER ERROR] Error fetching students:", error);
        res.status(500).json({ error: "Failed to load database records" });
    }
});

// Add a brand new student
app.post('/api/students', async (req, res) => {
    try {
        const { name, studentId, yearLevel } = req.body;
        const collection = database.collection("Tracker_Students");
        
        // Prevent duplicate IDs
        const existing = await collection.findOne({ $or: [{ 'Student ID': studentId }, { studentId: studentId }, { id: studentId }] });
        if (existing) {
            return res.status(400).json({ error: "A student with this ID already exists in the database." });
        }

        await collection.insertOne({
            Name: name,
            "Student ID": studentId,
            "Year level": yearLevel,
            password: "ubian2022" // Default fallback based on your login script
        });
        
        console.log(`[SERVER] Created new student: ${name}`);
        res.status(201).json({ message: "Student added successfully" });
    } catch (error) {
        console.error("[SERVER] Failed to add student:", error);
        res.status(500).json({ error: "Failed to add student" });
    }
});

// Edit an existing student's info
app.put('/api/students/:studentId', async (req, res) => {
    try {
        const targetId = req.params.studentId;
        const { name, newStudentId, yearLevel } = req.body;
        const collection = database.collection("Tracker_Students");

        // Alias sweep to find the correct student
        let searchConditions = [
            { 'Student ID': targetId }, { studentId: targetId }, { id: targetId }
        ];
        if (/^[0-9a-fA-F]{24}$/.test(targetId)) {
            searchConditions.push({ _id: new ObjectId(targetId) });
        }

        await collection.updateOne(
            { $or: searchConditions },
            { $set: { Name: name, "Student ID": newStudentId, "Year level": yearLevel } }
        );

        console.log(`[SERVER] Updated student profile: ${targetId}`);
        res.json({ message: "Student updated successfully" });
    } catch (error) {
        console.error("[SERVER] Failed to update student:", error);
        res.status(500).json({ error: "Failed to update student" });
    }
});

// Delete a student AND all their linked bills
app.delete('/api/students/:studentId', async (req, res) => {
    try {
        const targetId = req.params.studentId;
        const studentsCollection = database.collection("Tracker_Students");
        const billsCollection = database.collection("Tracker_student_bills");

        console.log(`\n[SERVER DELETE] Initiating purge for student ID: ${targetId}`);

        // 1. Find them
        let searchConditions = [
            { 'Student ID': targetId }, { studentId: targetId }, { id: targetId }
        ];
        if (/^[0-9a-fA-F]{24}$/.test(targetId)) {
            searchConditions.push({ _id: new ObjectId(targetId) });
        }

        // 2. Erase the profile
        const deleteProfile = await studentsCollection.deleteOne({ $or: searchConditions });
        console.log(`[SERVER DELETE] Profiles erased: ${deleteProfile.deletedCount}`);

        // 3. Erase all personal bills linked to their IDs (String and Number format)
        const deleteBills = await billsCollection.deleteMany({ 
            $or: [
                { studentId: targetId }, 
                { studentId: String(targetId) },
                { studentId: Number(targetId) }
            ]
        });
        console.log(`[SERVER DELETE] Ghost bills erased: ${deleteBills.deletedCount}`);

        res.json({ message: "Student and all associated data annihilated." });
    } catch (error) {
        console.error("[SERVER DELETE ERROR]:", error);
        res.status(500).json({ error: "Failed to delete student" });
    }
});

app.get('/api/students/:studentId', async (req, res) => {
    try {
        const targetId = req.params.studentId;
        const collection = database.collection("Tracker_Students");
        
        let orConditions = [
            { 'Student ID': targetId },
            { studentId: targetId },
            { id: targetId }
        ];

        // Only attempt to cast to ObjectId if it's a valid 24-character hex string
        if (/^[0-9a-fA-F]{24}$/.test(targetId)) {
            orConditions.push({ _id: new ObjectId(targetId) });
        }
        
        const student = await collection.findOne({ $or: orConditions });
        
        if (!student) {
            return res.status(404).json({ error: "Student not found in database." });
        }
        
        res.json(student);
    } catch (error) {
        console.error("Error fetching single student profile:", error);
        res.status(500).json({ error: "Failed to load database records" });
    }
});

// 2. Fetch a specific student's bills (The updated route)
app.get('/api/bills/:studentId', async (req, res) => {
    try {
        const targetId = req.params.studentId;
        const studentCollection = database.collection("Tracker_Students");
        const billsCollection = database.collection("Tracker_student_bills");

        // Step 1: Find the student first to gather all their possible aliases
        let studentQuery = [
            { 'Student ID': targetId },
            { studentId: targetId },
            { id: targetId },
            { 'Student ID': parseInt(targetId) },
            { studentId: parseInt(targetId) }
        ];
        
        // Only cast to ObjectId if it's a valid hex string
        if (/^[0-9a-fA-F]{24}$/.test(targetId)) {
            studentQuery.push({ _id: new ObjectId(targetId) });
        }

        const student = await studentCollection.findOne({ $or: studentQuery });
        
        // Step 2: Build a master list of all possible ID formats
        let aliases = [targetId, parseInt(targetId), Number(targetId)];

        if (student) {
            // Push every conceivable version of their ID into the sweep list
            if (student['Student ID']) { aliases.push(student['Student ID']); aliases.push(parseInt(student['Student ID'])); }
            if (student.studentId) { aliases.push(student.studentId); aliases.push(parseInt(student.studentId)); }
            if (student.id) { aliases.push(student.id); aliases.push(parseInt(student.id)); }
            if (student._id) { 
                aliases.push(student._id.toString()); 
                aliases.push(student._id); 
            }
        }

        if (/^[0-9a-fA-F]{24}$/.test(targetId)) {
            aliases.push(new ObjectId(targetId));
        }

        // Step 3: Search bills using ALL known aliases at once
        const bills = await billsCollection.find({ studentId: { $in: aliases } }).toArray();

        res.json(bills);
    } catch (error) {
        console.error("Error fetching student bills:", error);
        res.status(500).json({ error: "Failed to fetch bills from database" });
    }
});

// ==========================================
// MASTER BILL ROUTES (MANAGE BILLS)
// ==========================================

// 1. Fetch all master bills for the dashboard
app.get('/api/manage-bills', async (req, res) => {
    try {
        const collection = database.collection("Tracker_Bills");
        const bills = await collection.find({}).toArray();
        res.json(bills);
    } catch (error) {
        console.error("Error fetching master bills:", error);
        res.status(500).json({ error: "Failed to fetch master bills" });
    }
});

// 2. Create a master bill and broadcast
app.post('/api/manage-bills', async (req, res) => {
    try {
        const { name, amount, dueDate, targetYear } = req.body;
        const studentsCollection = database.collection("Tracker_Students");
        const manageBillsCollection = database.collection("Tracker_Bills");
        const studentBillsCollection = database.collection("Tracker_student_bills");

        let studentQuery = {};
        if (targetYear && targetYear !== "Everyone") {
            studentQuery = { $or: [{ "Year level": targetYear }, { yearLevel: targetYear }] };
        }

        const targetStudents = await studentsCollection.find(studentQuery).toArray();
        const studentCount = targetStudents.length;
        const expectedAmount = amount * studentCount;

        const masterBill = {
            billName: name,
            amountDue: amount,
            dueDate: dueDate,
            targetYear: targetYear || "Everyone",
            expectedAmount: expectedAmount,
            accumulatedAmount: 0.00 
        };

        const result = await manageBillsCollection.insertOne(masterBill);
        const globalBillId = result.insertedId;

        if (studentCount > 0) {
            const individualBills = targetStudents.map(student => {
                const sId = student['Student ID'] || student.studentId || student.id || student._id;
                return {
                    globalBillId: globalBillId,
                    studentId: sId,
                    billName: name,
                    amountDue: amount,
                    dueDate: dueDate,
                    status: "pending"
                };
            });
            await studentBillsCollection.insertMany(individualBills);
        }

        res.status(201).json({ message: "Master bill created", billId: globalBillId });
    } catch (error) {
        console.error("Error broadcasting bill:", error);
        res.status(500).json({ error: "Failed to process bill" });
    }
});

app.put('/api/manage-bills/:billId', async (req, res) => {
    try {
        const billId = req.params.billId;
        const { name, amount, dueDate, targetYear } = req.body;
        const parsedAmount = parseFloat(amount);

        console.log(`\n[SERVER EDIT] Received request to recalculate bill ID: ${billId}`);

        const manageBillsCollection = database.collection("Tracker_Bills"); 
        const studentBillsCollection = database.collection("Tracker_student_bills");

        let globalIdConditions = [
            { globalBillId: billId },
            { globalBillId: String(billId) }
        ];

        if (/^[0-9a-fA-F]{24}$/.test(billId)) {
            globalIdConditions.push({ globalBillId: new ObjectId(billId) });
        }

        const globalIdQuery = { $or: globalIdConditions };

        await studentBillsCollection.updateMany(
            globalIdQuery,
            { $set: { billName: name, amountDue: parsedAmount, dueDate: dueDate } }
        );

        const totalStudents = await studentBillsCollection.countDocuments(globalIdQuery);
        const newExpectedAmount = totalStudents * parsedAmount;

        const paidStudents = await studentBillsCollection.countDocuments({
            $and: [ globalIdQuery, { status: 'paid' } ]
        });
        const newAccumulatedAmount = paidStudents * parsedAmount;

        let masterQueryConditions = [{ _id: billId }, { _id: String(billId) }];
        if (/^[0-9a-fA-F]{24}$/.test(billId)) {
            masterQueryConditions.push({ _id: new ObjectId(billId) });
        }

        await manageBillsCollection.updateOne(
            { $or: masterQueryConditions },
            { $set: {
                billName: name,
                amountDue: parsedAmount,
                dueDate: dueDate,
                targetYear: targetYear,
                expectedAmount: newExpectedAmount,
                accumulatedAmount: newAccumulatedAmount
            } }
        );

        console.log(`[SERVER EDIT] Math Updated -> Students: ${totalStudents}, Expected: ₱${newExpectedAmount}, Accumulated: ₱${newAccumulatedAmount}`);
        res.json({ message: "Bill updated and totals dynamically recalculated" });
    } catch (error) {
        console.error("[SERVER EDIT ERROR]:", error);
        res.status(500).json({ error: "Failed to update bill" });
    }
});

// 4. Delete a master bill and recall all copies (VERBOSE)
app.delete('/api/manage-bills/:billId', async (req, res) => {
    try {
        const billId = req.params.billId;
        console.log(`\n[SERVER DELETE] Received request to annihilate bill ID: ${billId}`);

        const manageBillsCollection = database.collection("Tracker_Bills");
        const studentBillsCollection = database.collection("Tracker_student_bills");

        const deleteMaster = await manageBillsCollection.deleteOne({ _id: new ObjectId(billId) });
        const deleteStudents = await studentBillsCollection.deleteMany({ globalBillId: new ObjectId(billId) });

        res.json({ message: "Bill annihilated" });
    } catch (error) {
        console.error("[SERVER DELETE ERROR]:", error);
        res.status(500).json({ error: "Failed to delete bill" });
    }
});

// ==========================================
// AUTOMATED EMAIL DISPATCHER
// ==========================================

// Configure the SMTP Cannon (You MUST change the user and pass)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cpess@ub.edu.ph', // Replace with the email account sending the messages
        pass: 'tqyv rvdu osou bntw'  // Replace with a Google App Password (NOT your normal password)
    }
});

// Fire warning emails to all pending students for a specific bill
app.post('/api/notify-pending/:billId', async (req, res) => {
    try {
        const billId = req.params.billId;
        const studentBillsCollection = database.collection("Tracker_student_bills");

        console.log(`\n[DISPATCHER] Initializing sweep for unpaid bills on ID: ${billId}`);

        // The invincible alias sweep from earlier, adapted for the dispatcher
        let globalIdConditions = [
            { globalBillId: billId },
            { globalBillId: String(billId) }
        ];
        if (/^[0-9a-fA-F]{24}$/.test(billId)) {
            globalIdConditions.push({ globalBillId: new ObjectId(billId) });
        }

        // Find everyone who matches the bill AND is still pending
        const pendingStudents = await studentBillsCollection.find({
            $and: [
                { $or: globalIdConditions },
                { status: "pending" }
            ]
        }).toArray();

        if (pendingStudents.length === 0) {
            console.log("[DISPATCHER] Target list empty. Everyone has paid.");
            return res.json({ message: "Everyone has paid. No emails dispatched." });
        }

        console.log(`[DISPATCHER] Locked onto ${pendingStudents.length} targets. Engaging...`);

        // Rapid-fire the emails
        let sentCount = 0;
        for (let student of pendingStudents) {
            // Reconstruct the email using the standardized university format
            const targetId = student.studentId || student.id || student['Student ID'];
            const targetEmail = `${targetId}@ub.edu.ph`;
            
            // Format the due date cleanly
            const dueDateString = student.dueDate ? new Date(student.dueDate).toLocaleDateString() : 'N/A';

            const mailOptions = {
                from: '"CPESS" <your.email@gmail.com>',
                to: targetEmail,
                subject: `URGENT: Outstanding Balance for ${student.billName}`,
                text: `Attention Student ${targetId},\n\nOur system indicates you have a pending balance of ₱${parseFloat(student.amountDue).toFixed(2)} for the ${student.billName}.\n\nThe deadline for this payment is ${dueDateString}.\n\nPlease settle this account immediately to avoid further action.\n\n- CPESS Billing Department`
            };

            await transporter.sendMail(mailOptions);
            console.log(`[DISPATCHER] Warning shot fired at: ${targetEmail}`);
            sentCount++;
        }

        res.json({ message: `Successfully notified ${sentCount} students.` });
    } catch (error) {
        console.error("[DISPATCHER ERROR]:", error);
        res.status(500).json({ error: "Failed to dispatch emails. Check your transporter configuration." });
    }
});

app.put('/api/bills/:billId/status', async (req, res) => {
    try {
        const billId = req.params.billId;
        const { status, globalBillId, amountDue } = req.body;

        const studentBillsCollection = database.collection("Tracker_student_bills");
        const manageBillsCollection = database.collection("Tracker_Bills");

        // Update the specific student's bill status
        await studentBillsCollection.updateOne(
            { _id: new ObjectId(billId) },
            { $set: { status: status } }
        );

        // Instantly recalculate the master bill's accumulated amount
        const paidCount = await studentBillsCollection.countDocuments({
            globalBillId: new ObjectId(globalBillId),
            status: 'paid'
        });

        const newAccumulated = paidCount * parseFloat(amountDue);

        // Update the master bill
        await manageBillsCollection.updateOne(
            { _id: new ObjectId(globalBillId) },
            { $set: { accumulatedAmount: newAccumulated } }
        );

        res.json({ success: true, newAccumulated });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ error: "Failed to update database status" });
    }
});

// 🚨 EMERGENCY DEBUG ROUTE - DUMPS ENTIRE COLLECTION 🚨
app.get('/api/debug/dump-bills', async (req, res) => {
    try {
        // This checks the exact collection name we used in the GET route
        const collection = database.collection("Tracker_student_bills");
        const allBills = await collection.find({}).toArray();
        res.json({ count: allBills.length, data: allBills });
    } catch (error) {
        console.error("Debug route failed:", error);
        res.status(500).json({ error: "Debug pipe burst." });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend Express server is actively listening on port ${PORT}...`);
});