const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

// ✅ FIX 1: Better CORS (important for mobile + deployment)
app.use(cors({
  origin: "*"
}));

const PORT = 5000;

// ✅ SHEET IDS
const ACADEMICS_SHEET_ID = "1qt0lRI5whwoPk6oXMorbfPJ2dyLPXzYIr36VGhjCAU4";
const HOMEWORK_SHEET_ID = "1r1bO7gyK3EebizfR6sLbfuhUE2Q5FypZy5kTbRUhiII";

// =========================
// ✅ ROOT
// =========================
app.get("/", (req, res) => {
  res.send("Backend running ✅");
});


// =========================
// 📚 HOMEWORK
// =========================
app.get("/homework", async (req, res) => {
  try {
    const { className, section } = req.query;

    const url = `https://opensheet.elk.sh/${HOMEWORK_SHEET_ID}/Sheet%201`;

    const response = await axios.get(url);
    const data = Array.isArray(response.data) ? response.data : [];

    const result = data.filter(row =>
      row.Type?.toLowerCase().includes("home") &&
      row.Class?.toString().trim() === className &&
      row.Section?.toString().trim() === section &&
      row.Status?.toLowerCase() !== "closed"
    );

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.json([]);
  }
});


// =========================
// 🔔 NOTIFICATIONS
// =========================
app.get("/notifications", async (req, res) => {
  try {
    const { className, section, studentId } = req.query;

    const url = `https://opensheet.elk.sh/${HOMEWORK_SHEET_ID}/Sheet%201`;

    const response = await axios.get(url);
    const data = Array.isArray(response.data) ? response.data : [];

    const result = data.filter(row => {
      const type = row.Type?.toLowerCase()?.trim();

      if (row.Class?.trim() !== className) return false;
      if (row.Section?.trim() !== section) return false;
      if (row.Status?.toLowerCase() === "closed") return false;

      if (type === "all") return true;

      if (type === "alert") {
        const ids = row["Pending ID's"]
          ? row["Pending ID's"].split(",").map(i => i.trim())
          : [];

        return ids.includes(studentId);
      }

      return false;
    });

    res.json(result.reverse());
  } catch (err) {
    console.error(err.message);
    res.json([]);
  }
});


// =========================
// 🚨 ATTENDANCE
// =========================
app.get("/attendance", async (req, res) => {
  try {
    const { className, section, studentId } = req.query;

    const url = `https://opensheet.elk.sh/${HOMEWORK_SHEET_ID}/Sheet%201`;

    const response = await axios.get(url);
    const data = Array.isArray(response.data) ? response.data : [];

    const result = data.filter(row => {
      const ids = row["Pending ID's"]
        ? row["Pending ID's"].split(",").map(i => i.trim())
        : [];

      return (
        row.Type?.toLowerCase() === "attendance" &&
        row.Class?.trim() === className &&
        row.Section?.trim() === section &&
        ids.includes(studentId)
      );
    });

    res.json(result.reverse());
  } catch (err) {
    console.error(err.message);
    res.json([]);
  }
});


// =========================
// 🎓 ACADEMICS
// =========================
app.get("/academics", async (req, res) => {
  try {
    const { className, section } = req.query;

    const sheetName = `${className} ${section}`;
    const url = `https://opensheet.elk.sh/${ACADEMICS_SHEET_ID}/${encodeURIComponent(sheetName)}`;

    console.log("Fetching Academics:", url);

    const response = await axios.get(url);
    const data = Array.isArray(response.data) ? response.data : [];

    const cleaned = data.map(row => ({
      "Exam Type": row["Exam Type"]?.trim(),
      "Student ID": row["Student ID"]?.trim(),
      "Student Name": row["Student Name"]?.trim(),
      "Subject": row["Subject"]?.trim(),
      "Teacher": row["Teacher"]?.trim(),
      "Experience": row["Experience"]?.toString().trim(),
      "Date": row["Date"]?.trim(),
      "Marks": Number(row["Marks"]),
      "Out of": Number(row["Out of"]),
      "Percentage": Number(row["Percentage"]),
      "Rank": row["Rank"]
    }));

    res.json(cleaned);

  } catch (err) {
    console.error("Academics Error:", err.message);
    res.json([]);
  }
});


// =========================
// 👨‍🏫 TEACHERS
// =========================
app.get("/teachers", async (req, res) => {
  try {
    const { className, section } = req.query;

    const sheetName = `${className} ${section}`;
    const url = `https://opensheet.elk.sh/${ACADEMICS_SHEET_ID}/${encodeURIComponent(sheetName)}`;

    const response = await axios.get(url);
    const data = Array.isArray(response.data) ? response.data : [];

    const teachersMap = {};

    data.forEach(row => {
      if (row.Subject && row.Teacher) {
        teachersMap[row.Subject] = {
          Subject: row.Subject,
          Teacher: row.Teacher,
          Experience: row.Experience || "N/A"
        };
      }
    });

    res.json(Object.values(teachersMap));

  } catch (err) {
    console.error(err.message);
    res.json([]);
  }
});


// =========================
// 👨‍🎓 STUDENTS
// =========================
app.get("/students", async (req, res) => {
  try {
    const { className, section } = req.query;

    const sheetName = `${className} ${section}`;
    const url = `https://opensheet.elk.sh/${ACADEMICS_SHEET_ID}/${encodeURIComponent(sheetName)}`;

    const response = await axios.get(url);
    const data = Array.isArray(response.data) ? response.data : [];

    const studentsMap = {};

    data.forEach(row => {
      const id = row["Student ID"];

      if (!studentsMap[id]) {
        studentsMap[id] = {
          id,
          name: row["Student Name"],
          percentages: [],
          latestExam: row["Exam Type"]
        };
      }

      studentsMap[id].percentages.push(Number(row["Percentage"]));
    });

    const result = Object.values(studentsMap).map(s => {
      const avg =
        s.percentages.reduce((a, b) => a + b, 0) /
        s.percentages.length;

      return {
        id: s.id,
        name: s.name,
        average: avg.toFixed(1),
        latestExam: s.latestExam
      };
    });

    res.json(result);

  } catch (err) {
    console.error(err.message);
    res.json([]);
  }
});


// =========================
// 🚀 START SERVER (FIXED)
// =========================
app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
  console.log("✅ Server running");
});