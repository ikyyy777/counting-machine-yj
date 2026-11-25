import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyCCCZtxfGzu--qKZTivsgg4F0EwtnFen6k';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
}

export interface SkillAnalysisResult {
  matchedSkills: string[];
  unmatchedTasks: string[];
  recommendedGrade: string;
  explanation: string;
}

export const analyzeSkillGrade = async (outputDetails: any[], skillDetails: any[]): Promise<SkillAnalysisResult> => {
  try {
    // Membuat prompt untuk analisis
    const prompt = `
      Analyze the employee's skill grade based on the following data:

      Current Tasks (Process Names):
      ${outputDetails.map(d => `- ${d.PROCESS_NAME}`).join('\n')}

      Known Skills (Skill Descriptions):
      ${skillDetails.map(s => `- ${s.DESCR} (Grade: ${s.SKILL_GRADE})`).join('\n')}

      Please analyze:
      1. Compare the current tasks with known skills by finding similar keywords
      2. For each task, identify if the employee has matching skill and what grade
      3. Consider the complexity of tasks and time per process
      4. Provide a final skill grade recommendation (A/B/C/D)
      5. Give brief explanation for the recommendation
      
      Format the response as:
      {
        "matchedSkills": ["skill1", "skill2"],
        "unmatchedTasks": ["task1", "task2"],
        "recommendedGrade": "X",
        "explanation": "brief explanation"
      }
    `;

    const response = await axios.post(
      GEMINI_API_URL,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        }
      }
    );

    const result = response.data as GeminiResponse;
    
    // Extract JSON from the response text
    const responseText = result.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }

    const cleanJson = jsonMatch[1] || jsonMatch[0];
    const parsedResult = JSON.parse(cleanJson) as SkillAnalysisResult;

    // Validate the result structure
    if (!parsedResult.matchedSkills || !parsedResult.unmatchedTasks || 
        !parsedResult.recommendedGrade || !parsedResult.explanation) {
      throw new Error('Invalid analysis result structure');
    }

    return parsedResult;
  } catch (error) {
    console.error('Error analyzing skill grade:', error);
    throw error;
  }
}; 