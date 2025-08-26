import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import database from "../connect.cjs";

const router = express.Router();

// POST /api/ai-analytics/create-analysis - Generate AI analysis for faculty reports
router.post("/create-analysis", authenticateToken, async (req, res) => {
  try {
    // Only principals and VPE can access this endpoint
    if (req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      return res.status(403).json({ 
        error: "Access denied. Only principals and VPE can create AI analysis." 
      });
    }

    const { schoolYear, termName, sectionFilter, trackFilter, strandFilter } = req.body;

    if (!schoolYear || !termName) {
      return res.status(400).json({ 
        error: "School year and term name are required" 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    console.log(`[AI ANALYTICS] Starting analysis for ${schoolYear} - ${termName}`);

    // Fetch faculty assignments data (this is the correct collection)
    const facultyAssignments = await db.collection('facultyassignments').find({
      schoolYear: schoolYear,
      termName: termName,
      status: { $ne: 'archived' }
    }).toArray();

    console.log(`[AI ANALYTICS] Found ${facultyAssignments.length} faculty assignments`);

    // Resolve faculty names from users collection for nicer reporting
    const facultyObjectIds = [...new Set(
      facultyAssignments
        .map(fa => fa.facultyId)
        .filter(Boolean)
        .map(id => {
          try { return typeof id === 'string' ? new database.ObjectId(id) : id; } catch { return null; }
        })
        .filter(Boolean)
    )];

    const facultyUsers = facultyObjectIds.length > 0
      ? await db.collection('users')
          .find({ _id: { $in: facultyObjectIds } })
          .project({ firstname: 1, middlename: 1, lastname: 1 })
          .toArray()
      : [];

    const facultyIdToName = new Map(
      facultyUsers.map(u => [String(u._id), [u.firstname, u.middlename, u.lastname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()])
    );

    // Build per-faculty section roster from faculty assignments
    const facultyIdToSections = new Map();
    for (const fa of facultyAssignments) {
      const id = String(fa.facultyId || '');
      if (!id) continue;
      if (!facultyIdToSections.has(id)) facultyIdToSections.set(id, new Set());
      if (fa.sectionName) facultyIdToSections.get(id).add(fa.sectionName);
    }

    // Fetch audit logs for student activity
    const auditLogs = await db.collection('AuditLogs').find({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1), // Start of current year
        $lte: new Date()
      }
    }).toArray();

    console.log(`[AI ANALYTICS] Found ${auditLogs.length} audit logs`);

    // Fetch assignments using the correct collection name
    const assignments = await db.collection('Assignments').find({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1), // Start of current year
        $lte: new Date()
      }
    }).toArray();

    console.log(`[AI ANALYTICS] Found ${assignments.length} assignments`);

    // Fetch quizzes using the correct collection name
    const quizzes = await db.collection('Quizzes').find({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1), // Start of current year
        $lte: new Date()
      }
    }).toArray();

    console.log(`[AI ANALYTICS] Found ${quizzes.length} quizzes`);

    // Build per-faculty workload from assignments/quizzes
    const creatorIds = [
      ...assignments.map(a => a.createdBy).filter(Boolean),
      ...quizzes.map(q => q.createdBy).filter(Boolean)
    ]
      .map(id => {
        try { return typeof id === 'string' ? new database.ObjectId(id) : id; } catch { return null; }
      })
      .filter(Boolean);

    const uniqueCreatorIds = [...new Set(creatorIds.map(id => String(id)))].map(id => new database.ObjectId(id));

    const creatorUsers = uniqueCreatorIds.length > 0
      ? await db.collection('users')
          .find({ _id: { $in: uniqueCreatorIds } })
          .project({ firstname: 1, middlename: 1, lastname: 1 })
          .toArray()
      : [];

    const creatorIdToName = new Map(
      creatorUsers.map(u => [String(u._id), [u.firstname, u.middlename, u.lastname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()])
    );

    const workloadCounter = new Map();
    for (const a of assignments) {
      const key = String(a.createdBy || 'unknown');
      workloadCounter.set(key, (workloadCounter.get(key) || 0) + 1);
    }
    for (const q of quizzes) {
      const key = String(q.createdBy || 'unknown');
      workloadCounter.set(key, (workloadCounter.get(key) || 0) + 1);
    }

    const workloadByFaculty = [...workloadCounter.entries()]
      .sort(([, c1], [, c2]) => c2 - c1)
      .map(([id, count]) => ({
        facultyId: id,
        facultyName: creatorIdToName.get(id) || facultyIdToName.get(id) || `Unknown Faculty`,
        sections: Array.from(facultyIdToSections.get(String(id)) || []),
        totalActivities: count
      }));

    // Fetch student reports using the correct collection name
    const studentReports = await db.collection('studentreports').find({
      schoolYear: schoolYear,
      termName: termName
    }).toArray();

    console.log(`[AI ANALYTICS] Found ${studentReports.length} student reports`);

    // Fetch classes to get section/track/strand information
    const classes = await db.collection('Classes').find({}).toArray();
    console.log(`[AI ANALYTICS] Found ${classes.length} classes`);

    // Get unique sections, tracks, and strands from classes
    const sections = [...new Set(classes.map(c => c.sectionName).filter(Boolean))];
    const tracks = [...new Set(classes.map(c => c.trackName).filter(Boolean))];
    const strands = [...new Set(classes.map(c => c.strandName).filter(Boolean))];

    console.log(`[AI ANALYTICS] Sections: ${sections.join(', ')}`);
    console.log(`[AI ANALYTICS] Tracks: ${tracks.join(', ')}`);
    console.log(`[AI ANALYTICS] Strands: ${strands.join(', ')}`);

    // Prepare data for AI analysis
    const analysisData = {
      schoolYear,
      termName,
      facultyAssignments: facultyAssignments.length,
      assignments: assignments.length,
      quizzes: quizzes.length,
      studentReports: studentReports.length,
      auditLogs: auditLogs.length,
      classes: classes.length,
      sections,
      tracks,
      strands,
      facultyNames: [...new Set(
        facultyAssignments
          .map(fa => {
            const id = String(fa.facultyId || '');
            return facultyIdToName.get(id) || `Unknown Faculty`;
          })
          .filter(Boolean)
      )],
      workloadByFaculty,
      activitySummary: {
        totalActivities: assignments.length + quizzes.length,
        assignmentsCount: assignments.length,
        quizzesCount: quizzes.length,
        postedActivities: assignments.filter(a => a.postAt && new Date(a.postAt) <= new Date()).length + 
                         quizzes.filter(q => q.postAt && new Date(q.postAt) <= new Date()).length,
        pendingActivities: assignments.filter(a => !a.postAt || new Date(a.postAt) > new Date()).length + 
                          quizzes.filter(q => !q.postAt || new Date(q.postAt) > new Date()).length
      },
      studentEngagement: {
        totalStudents: auditLogs.filter(log => log.action === 'login' || log.action === 'logout').length,
        loginCount: auditLogs.filter(log => log.action === 'login').length,
        logoutCount: auditLogs.filter(log => log.action === 'logout').length,
        otherActions: auditLogs.filter(log => log.action !== 'login' && log.action !== 'logout').length
      }
    };

    console.log(`[AI ANALYTICS] Analysis data prepared:`, JSON.stringify(analysisData, null, 2));

    // Apply filters if provided
    if (sectionFilter && sectionFilter !== 'All Sections') {
      analysisData.sections = [sectionFilter];
      analysisData.facultyAssignments = facultyAssignments.filter(fa => fa.sectionName === sectionFilter).length;
    }

    if (trackFilter && trackFilter !== 'All Tracks') {
      analysisData.tracks = [trackFilter];
      analysisData.facultyAssignments = facultyAssignments.filter(fa => fa.trackName === trackFilter).length;
    }

    if (strandFilter && strandFilter !== 'All Strands') {
      analysisData.strands = [strandFilter];
      analysisData.facultyAssignments = facultyAssignments.filter(fa => fa.strandName === strandFilter).length;
    }

    // Create the prompt for DeepSeek AI
    const workloadLines = analysisData.workloadByFaculty.map(w => `- ${w.facultyName}${w.sections && w.sections.length ? ` (Sections: ${w.sections.join(', ')})` : ''}: ${w.totalActivities} activities`).join('\n');

    // Build a faculty directory section with names and sections; never include raw IDs
    const facultyDirectoryLines = [...new Set(
      facultyAssignments.map(fa => String(fa.facultyId || ''))
    )]
      .map(id => {
        const name = facultyIdToName.get(id) || 'Unknown Faculty';
        const secs = Array.from(facultyIdToSections.get(id) || []);
        return `- ${name}${secs.length ? ` — Sections: ${secs.join(', ')}` : ''}`;
      })
      .join('\n');

    const prompt = `As an educational analytics expert, please analyze the following data from ${schoolYear} - ${termName} and provide insights on:

SCHOOL YEAR: ${schoolYear}
TERM: ${termName}

FACULTY DIRECTORY (Names and Sections):
${facultyDirectoryLines || '- No faculty listed'}

FACULTY ACTIVITIES:
- Total faculty assignments: ${analysisData.facultyAssignments}
- Sections: ${analysisData.sections.join(', ') || 'None found'}
- Tracks: ${analysisData.tracks.join(', ') || 'None found'}
- Strands: ${analysisData.strands.join(', ') || 'None found'}
- Faculty members: ${analysisData.facultyNames.join(', ') || 'None found'}
- Workload by faculty:\n${workloadLines || '- No creators found'}

ACTIVITY SUMMARY:
- Total activities created: ${analysisData.activitySummary.totalActivities}
- Assignments: ${analysisData.activitySummary.assignmentsCount}
- Quizzes: ${analysisData.activitySummary.quizzesCount}
- Posted activities: ${analysisData.activitySummary.postedActivities}
- Pending activities: ${analysisData.activitySummary.pendingActivities}

STUDENT ENGAGEMENT:
- Total student interactions: ${analysisData.studentEngagement.totalStudents}
- Login count: ${analysisData.studentEngagement.loginCount}
- Logout count: ${analysisData.studentEngagement.logoutCount}
- Other actions: ${analysisData.studentEngagement.otherActions}

SYSTEM OVERVIEW:
- Total classes: ${analysisData.classes}
- Total audit logs: ${analysisData.auditLogs}

Please provide:
1. A comprehensive summary of faculty performance and activity levels (use names above, avoid IDs)
2. Analysis of student engagement patterns
3. Identification of areas where sections can improve study time and participation
4. Recommendations for faculty to enhance student engagement
5. Suggestions for improving assignment and quiz effectiveness
6. Overall academic performance insights

Format your response in a clear, structured manner suitable for educational leadership review.`;

    console.log(`[AI ANALYTICS] Sending prompt to DeepSeek AI...`);

    // Robust OpenRouter call with retry and fallback models
    async function callOpenRouterWithRetry(models, bodyBuilder, maxRetries = 4, baseDelayMs = 1500) {
      let lastError = null;
      for (const model of models) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://juanlms-webapp.onrender.com",
                "X-Title": "JuanLMS Analytics",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(bodyBuilder(model))
            });

            if (response.status === 429) {
              const waitMs = Math.min(baseDelayMs * Math.pow(2, attempt), 15000);
              const text = await response.text().catch(() => '');
              console.warn(`[AI ANALYTICS] 429 from model ${model} (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${waitMs}ms. Raw: ${text}`);
              await new Promise(r => setTimeout(r, waitMs));
              continue;
            }

            if (!response.ok) {
              const text = await response.text().catch(() => '');
              throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
            }

            return await response.json();
          } catch (err) {
            lastError = err;
            // For network or 5xx errors, backoff then retry
            const waitMs = Math.min(baseDelayMs * Math.pow(2, attempt), 15000);
            console.warn(`[AI ANALYTICS] Error calling model ${model} (attempt ${attempt + 1}/${maxRetries + 1}): ${err?.message}. Retrying in ${waitMs}ms`);
            await new Promise(r => setTimeout(r, waitMs));
          }
        }
        console.warn(`[AI ANALYTICS] Exhausted retries for model ${model}, moving to next fallback if any.`);
      }
      throw lastError || new Error('OpenRouter call failed after retries');
    }

    const primaryModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free';
    const fallbackModels = [
      'deepseek/deepseek-r1',
      'deepseek/deepseek-chat',
      'deepseek/deepseek-r1:free',
      'deepseek/deepseek-chat:free'
    ];
    const modelsToTry = [primaryModel, ...fallbackModels];

    const aiResponseJson = await callOpenRouterWithRetry(modelsToTry, (model) => ({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }));

    const analysis = aiResponseJson.choices?.[0]?.message?.content || "No analysis generated";

    console.log(`[AI ANALYTICS] Analysis received from DeepSeek AI`);

    // Store the analysis in the database for future reference
    const analysisRecord = {
      schoolYear,
      termName,
      sectionFilter: sectionFilter || null,
      trackFilter: trackFilter || null,
      strandFilter: strandFilter || null,
      analysisData,
      aiAnalysis: analysis,
      createdBy: req.user._id,
      createdByRole: req.user.role,
      createdAt: new Date()
    };

    await db.collection('AIAnalytics').insertOne(analysisRecord);

    console.log(`[AI ANALYTICS] Analysis stored in database`);

    res.json({
      success: true,
      analysis,
      metadata: {
        schoolYear,
        termName,
        filters: {
          section: sectionFilter,
          track: trackFilter,
          strand: strandFilter
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("AI Analytics Error:", error);
    res.status(500).json({ 
      error: "Failed to generate AI analysis",
      details: error.message 
    });
  }
});

// GET /api/ai-analytics/history - Get analysis history for the user
router.get("/history", authenticateToken, async (req, res) => {
  try {
    // Only principals and VPE can access this endpoint
    if (req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      return res.status(403).json({ 
        error: "Access denied. Only principals and VPE can view analysis history." 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    const history = await db.collection('AIAnalytics')
      .find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.json({
      success: true,
      history: history.map(item => ({
        id: item._id,
        schoolYear: item.schoolYear,
        termName: item.termName,
        filters: {
          section: item.sectionFilter,
          track: item.trackFilter,
          strand: item.strandFilter
        },
        createdAt: item.createdAt,
        analysisPreview: item.aiAnalysis.substring(0, 200) + "..."
      }))
    });

  } catch (error) {
    console.error("AI Analytics History Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch analysis history",
      details: error.message 
    });
  }
});

// GET /api/ai-analytics/:id - Get specific analysis details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    // Only principals and VPE can access this endpoint
    if (req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      return res.status(403).json({ 
        error: "Access denied. Only principals and VPE can view analysis details." 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    const analysis = await db.collection('AIAnalytics').findOne({ 
      _id: new database.ObjectId(req.params.id),
      createdBy: req.user._id 
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    res.json({
      success: true,
      analysis: {
        id: analysis._id,
        schoolYear: analysis.schoolYear,
        termName: analysis.termName,
        filters: {
          section: analysis.sectionFilter,
          track: analysis.trackFilter,
          strand: analysis.strandFilter
        },
        analysisData: analysis.analysisData,
        aiAnalysis: analysis.aiAnalysis,
        createdAt: analysis.createdAt
      }
    });

  } catch (error) {
    console.error("AI Analytics Details Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch analysis details",
      details: error.message 
    });
  }
});

// Temporary test endpoint (remove this in production)
router.post("/test-data-collection", async (req, res) => {
  try {
    const { schoolYear, termName } = req.body;

    if (!schoolYear || !termName) {
      return res.status(400).json({ 
        error: "School year and term name are required" 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    console.log(`[TEST] Starting data collection test for ${schoolYear} - ${termName}`);

    // Test all collections
    const collections = await db.listCollections().toArray();
    console.log(`[TEST] Available collections:`, collections.map(c => c.name));

    // Fetch faculty assignments data
    const facultyAssignments = await db.collection('facultyassignments').find({
      schoolYear: schoolYear,
      termName: termName,
      status: { $ne: 'archived' }
    }).toArray();

    console.log(`[TEST] Found ${facultyAssignments.length} faculty assignments`);
    if (facultyAssignments.length > 0) {
      console.log(`[TEST] Sample faculty assignment:`, facultyAssignments[0]);
    }

    // Fetch audit logs for student activity
    const auditLogs = await db.collection('AuditLogs').find({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1),
        $lte: new Date()
      }
    }).toArray();

    console.log(`[TEST] Found ${auditLogs.length} audit logs`);
    if (auditLogs.length > 0) {
      console.log(`[TEST] Sample audit log:`, auditLogs[0]);
    }

    // Fetch assignments
    const assignments = await db.collection('Assignments').find({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1),
        $lte: new Date()
      }
    }).toArray();

    console.log(`[TEST] Found ${assignments.length} assignments`);
    if (assignments.length > 0) {
      console.log(`[TEST] Sample assignment:`, assignments[0]);
    }

    // Fetch quizzes
    const quizzes = await db.collection('Quizzes').find({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1),
        $lte: new Date()
      }
    }).toArray();

    console.log(`[TEST] Found ${quizzes.length} quizzes`);
    if (quizzes.length > 0) {
      console.log(`[TEST] Sample quiz:`, quizzes[0]);
    }

    // Fetch student reports
    const studentReports = await db.collection('studentreports').find({
      schoolYear: schoolYear,
      termName: termName
    }).toArray();

    console.log(`[TEST] Found ${studentReports.length} student reports`);
    if (studentReports.length > 0) {
      console.log(`[TEST] Sample student report:`, studentReports[0]);
    }

    // Fetch classes
    const classes = await db.collection('Classes').find({}).toArray();
    console.log(`[TEST] Found ${classes.length} classes`);
    if (classes.length > 0) {
      console.log(`[TEST] Sample class:`, classes[0]);
    }

    res.json({
      success: true,
      summary: {
        facultyAssignments: facultyAssignments.length,
        auditLogs: auditLogs.length,
        assignments: assignments.length,
        quizzes: quizzes.length,
        studentReports: studentReports.length,
        classes: classes.length
      },
      collections: collections.map(c => c.name)
    });

  } catch (error) {
    console.error("Test Data Collection Error:", error);
    res.status(500).json({ 
      error: "Failed to test data collection",
      details: error.message 
    });
  }
});

export default router;
