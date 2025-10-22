import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import database from "../connect.cjs";
import { ObjectId } from "mongodb";

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

    const { schoolYear, termName, sectionFilter, trackFilter, strandFilter, reportType: clientReportType } = req.body;

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
          try { return typeof id === 'string' ? new ObjectId(id) : id; } catch { return null; }
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
        try { return typeof id === 'string' ? new ObjectId(id) : id; } catch { return null; }
      })
      .filter(Boolean);

    const uniqueCreatorIds = [...new Set(creatorIds.map(id => String(id)))].map(id => new ObjectId(id));

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

    // Determine report type (year/strand/section)
    const inferredReportType = clientReportType || (sectionFilter ? 'section' : (strandFilter ? 'strand' : 'year'));

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

    const audienceLine = req.user.role === 'vice president of education'
      ? 'Audience: Vice President of Education (program-level insights, faculty workload trends, and strategic recommendations).'
      : 'Audience: Principal (school-wide outcomes, section performance, and actionable recommendations).';

    // Tailor instructions based on report type
    let focusBlock = '';
    if (inferredReportType === 'year') {
      focusBlock = `REPORT SCOPE: Whole active academic year (no specific strand/section filter).\n
Please provide balanced program/school-wide insights suitable for leadership review.`;
    } else if (inferredReportType === 'strand') {
      focusBlock = `REPORT SCOPE: Specific STRAND${strandFilter ? ` — ${strandFilter}` : ''}.\n
Focus on this strand: key trends, workload/participation patterns, and specific improvements for the strand (curriculum pacing, activity design, faculty coordination).`;
    } else if (inferredReportType === 'section') {
      focusBlock = `REPORT SCOPE: Specific SECTION${sectionFilter ? ` — ${sectionFilter}` : ''}.\n
Focus on this section: how students are doing (engagement signals, timeliness), strengths and weaknesses, targeted interventions and follow‑ups.`;
    }

    const workloadLines = analysisData.workloadByFaculty.map(w => `- ${w.facultyName}${w.sections && w.sections.length ? ` (Sections: ${w.sections.join(', ')})` : ''}: ${w.totalActivities} activities`).join('\n');

    // Get creator name for the analysis
    const creatorName = req.user.firstname && req.user.lastname 
      ? `${req.user.firstname} ${req.user.lastname}` 
      : req.user.firstname || req.user.lastname || 'System Administrator';

    const prompt = `As an educational analytics expert, prepare a role-aware report.\n${audienceLine}\n${focusBlock}\n\nSCHOOL YEAR: ${schoolYear}\nTERM: ${termName}\n\nFACULTY DIRECTORY (Names and Sections):\n${facultyDirectoryLines || '- No faculty listed'}\n\nFACULTY ACTIVITIES:\n- Total faculty assignments: ${analysisData.facultyAssignments}\n- Sections: ${analysisData.sections.join(', ') || 'None found'}\n- Tracks: ${analysisData.tracks.join(', ') || 'None found'}\n- Strands: ${analysisData.strands.join(', ') || 'None found'}\n- Faculty members: ${analysisData.facultyNames.join(', ') || 'None found'}\n- Workload by faculty:\n${workloadLines || '- No creators found'}\n\nACTIVITY SUMMARY (Assignments + Quizzes):\n- Total: ${analysisData.activitySummary.totalActivities}\n- Assignments: ${analysisData.activitySummary.assignmentsCount}\n- Quizzes: ${analysisData.activitySummary.quizzesCount}\n- Posted: ${analysisData.activitySummary.postedActivities}\n- Pending: ${analysisData.activitySummary.pendingActivities}\n\nSTUDENT ENGAGEMENT SIGNALS (from audit logs):\n- Interactions total: ${analysisData.studentEngagement.totalStudents}\n- Logins: ${analysisData.studentEngagement.loginCount}\n- Logouts: ${analysisData.studentEngagement.logoutCount}\n- Other actions: ${analysisData.studentEngagement.otherActions}\n\nSYSTEM OVERVIEW:\n- Total classes: ${analysisData.classes}\n- Total audit logs: ${analysisData.auditLogs}\n\nPlease provide:\n1) Executive summary tailored to the audience and report scope.\n2) Key findings for the scope (${inferredReportType}).\n3) For STRAND scope: what is seen in the strand and concrete improvements.\n4) For SECTION scope: how the students are doing, strengths and weaknesses, targeted interventions.\n5) Faculty recommendations to enhance engagement and activity effectiveness.\n6) Risks and next steps.\n\nIMPORTANT FORMATTING REQUIREMENTS:\n- Do NOT use markdown headers (###, ##, #) in your response\n- Use plain text formatting with clear section breaks\n- End the report with a clear signature section:
  "REPORT PREPARED BY:
   ${creatorName}
   ${req.user.role === 'principal' ? 'Principal' : req.user.role === 'vice president of education' ? 'Vice President of Education' : 'Administrator'}
   San Juan de Dios Educational Foundation, Inc.
   Date: ${new Date().toLocaleDateString()}"\n- Format clearly for leadership review without markdown syntax.`;

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
      reportType: inferredReportType,
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
        reportType: inferredReportType,
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

// GET /api/ai-analytics/history - Get analysis history
// - For principals: return analyses created by the current principal
// - For VPE: return analyses that have been shared to VPE
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

    const query = req.user.role === 'principal'
      ? { createdBy: req.user._id }
      : { sharedToVPE: true };

    const history = await db.collection('AIAnalytics')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
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
        sharedToVPE: !!item.sharedToVPE,
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
      _id: new ObjectId(req.params.id)
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    // Authorization: principals can view their own; VPE can view only if shared
    const isOwner = String(analysis.createdBy) === String(req.user._id);
    const isVPEWithAccess = req.user.role === 'vice president of education' && analysis.sharedToVPE === true;
    if (!(isOwner || isVPEWithAccess)) {
      return res.status(403).json({ error: "Access denied to this analysis" });
    }

    res.json({
      success: true,
      analysis: {
        id: analysis._id,
        schoolYear: analysis.schoolYear,
        termName: analysis.termName,
        reportType: analysis.reportType,
        sharedToVPE: !!analysis.sharedToVPE,
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

// POST /api/ai-analytics/:id/share-to-vpe - Share an analysis to VPE (principal only)
router.post("/:id/share-to-vpe", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'principal') {
      return res.status(403).json({ error: "Only principals can share analyses to VPE." });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    const _id = new ObjectId(req.params.id);
    const analysis = await db.collection('AIAnalytics').findOne({ _id });
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    if (String(analysis.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: "You can only share your own analyses." });
    }

    await db.collection('AIAnalytics').updateOne(
      { _id },
      { $set: { sharedToVPE: true, sharedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("AI Analytics Share Error:", error);
    res.status(500).json({ error: "Failed to share analysis to VPE", details: error.message });
  }
});

// DELETE /api/ai-analytics/:id - Delete an analysis (principal owner only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'principal') {
      return res.status(403).json({ error: "Only principals can delete analyses." });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    const _id = new ObjectId(req.params.id);
    const analysis = await db.collection('AIAnalytics').findOne({ _id });
    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    if (String(analysis.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: "You can only delete your own analyses." });
    }

    await db.collection('AIAnalytics').deleteOne({ _id });
    res.json({ success: true });
  } catch (error) {
    console.error("AI Analytics Delete Error:", error);
    res.status(500).json({ error: "Failed to delete analysis", details: error.message });
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
