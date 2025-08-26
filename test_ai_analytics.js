// Test script for AI Analytics endpoint
const API_BASE = "https://juanlms-webapp-server.onrender.com";

async function testAIAnalytics() {
  try {
    console.log("Testing AI Analytics data collection...");
    
    // Test the data collection endpoint
    const response = await fetch(`${API_BASE}/api/ai-analytics/test-data-collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        schoolYear: "2023-2024",
        termName: "Term 1"
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Data collection test successful:");
      console.log("Available collections:", data.collections);
      console.log("Data summary:", data.summary);
    } else {
      const errorText = await response.text();
      console.log("Error response:", response.status, errorText);
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testAIAnalytics();
