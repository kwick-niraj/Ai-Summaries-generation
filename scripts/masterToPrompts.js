// Requires: npm install openai dotenv
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

config(); // Load .env

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generatePrompt() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // or 'gpt-4.1' if supported
      temperature: 0.55,
      top_p: 0.7,
      max_tokens: 18000,
      messages: [
        {
          role: 'system',
          content: `
This is the master prompt and I would like you to generate a prompt which generates summaries for the mentioned book:

Objective:
Create a prompt which can be used to generate summaries which are clear, engaging, and fully written summary of the specified non-fiction book. The summary should explain the book’s key ideas in a chapter wise format, but the output must be a flowing longform summary, you can use or highlight points when needed.

⸻

✍️ Requirements:

1. Length & Readability
• Target word count: 22,000 to 25,000 characters
• Use simple, natural language that’s easy to understand
• Avoid complex vocabulary, overly poetic phrasing, or academic tone
• Make length and chapter's content dynamic, if you think any chapters of the book is more important then you can increase the length of that section.
• Categorize the chapters into their respective themes. Conclude all concepts in total of 8 chapters.

2. Originality & Clarity
• Do not copy phrases, or chapter titles from the original book
• Keep the original flow of concepts.
• Paraphrase deeply and present all ideas in your own words
• Create a fresh and engaging interpretation that’s true to the spirit of the book

3. Content Coverage
• Cover all key insights, principles, and takeaways
• Include generalized references to examples or stories, but do not retell them in full
• Ensure the summary can stand alone and provide full value even to someone who hasn’t read the book
• Do not use Author's name for generating summaries like: "Author's name" says that, or believes that or wanted to say this.
• Avoid repetitive use of the same subject nouns (e.g., “the boy”, “the author”, “the reader”). Use pronouns like he, she, or they where the subject is already clear.
• Do not refer to the audience using phrases like “the reader,” “readers,” or “you.” Instead, explain concepts directly and naturally in third-person — as if walking through a series of clear, observable ideas. Let the narrative flow from idea to idea without addressing or instructing anyone directly.

4. 📝 Intro & Conclusion
• Add a short **Introduction** (~800–1000 characters): Set expectations for the reader — explain what they’ll learn and why this book matters. Then transition smoothly into chapters.  
• Add a short **Conclusion** (~800–1000 characters): Recap the key takeaways and reflect on the book’s overall impact or message. Keep it practical and reinforcing.

5. Tone & Style
• Maintain a neutral, clear, and reflective tone
• Avoid jargon unless explained simply
• Write like a helpful guide — friendly, and easy to follow.
• Important: Humanize the summaries. Ask a question and then answer when needed, that is the right way to convey a message.

6. Flexibility in Layout
• Name each chapter with concise, clear, and concrete titles. Avoid poetic, abstract, or overly dramatic names.
• You may combine, or rename ideas as needed
• Structure the summary as a natural progression of understanding, leading the reader from foundational concepts to deeper insights
• Reflect the original concepts of the books and set the length of the chapters accordingly, if you believe the chapter is important and long in the original book then generate more summary for that chapter

7. Strategies to Use for Summary:
    "name": "tactical_breakdown",
    "description": "Implementation-focused summary that highlights practical steps, tools, and how-tos.",
    "prompt": "Structure the summary as a clear, practical walkthrough of the book’s strategies. Each chapter should cover a core idea or principle and explain how it works in real-life situations. Write in a clear, third-person, instructional tone. While the summary itself should flow in paragraphs, any actionable steps, techniques, or tools mentioned within a chapter should be listed using bullet points for clarity. Avoid second-person language ('you'), and use general, relatable examples to ground the advice. Keep the language simple, direct, and helpful."
  `,
        },
        {
          role: 'user',
          content: `
This is the master prompt and I would like you to generate a prompt which generates summaries for the mentioned book:

Objective: Create a prompt which can then generate clear, engaging, and fully written summary of the specified non-fiction book. The summary should explain the book’s key ideas in a chapter wise format, but the output must be a flowing longform summary, not a list of steps. Following is the details about the book:

### Title
**The 1% Rule: How to Fall in Love with the Process and Achieve Your Wildest Dreams**


### Core Themes
- The power of incremental progress
- Consistency over intensity
- The dangers of perfectionism and overwhelm
- The importance of process and daily habits
- Delayed gratification and long-term thinking
- Overcoming resistance and self-doubt

### Structure & Format
- Divided into thematic chapters with actionable advice
- Combines motivational narrative, research findings, and real-life examples
- Includes exercises, prompts, and reflection questions for readers
- Simple, conversational tone

### Key Concepts / Lessons
1. **The 1% Rule:** Focus on getting 1% better each day, rather than being overwhelmed by the end goal.
2. **Process over Outcome:** Fall in love with the daily process rather than being fixated solely on results.
3. **The Compound Effect:** Small improvements accumulate into significant, lasting changes.
4. **Clarity and Action:** Define clear goals and break them down into manageable, daily actions.
5. **Overcoming Resistance:** Acknowledge and push through fear, doubt, and procrastination.
6. **Momentum and Consistency:** Build confidence and motivation through regular, incremental progress.
7. **Celebrating Small Wins:** Recognize and reward progress to sustain motivation.
8. **Sustainable Growth:** Avoid burnout by embracing a steady, long-term approach.
`,
        },
      ],
    });

    const result = completion.choices[0].message.content;

    const outputPath = path.join(process.cwd(), 'prompt.txt');
    fs.writeFileSync(outputPath, result, 'utf-8');

    console.log(`✅ Summary saved to: ${outputPath}`);
  } catch (err) {
    console.error('❌ Error generating summary:', err);
  }
}

generatePrompt();