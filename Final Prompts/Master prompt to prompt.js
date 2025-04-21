import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.responses.create({
  model: "gpt-4.1",
  input: [
    {
      "role": "system",
      "content": [
        {
          "type": "input_text",
          "text": "This is the master prompt and I would like you to generate a  prompt which generates summaries for the mentioned book:\n\n Objective:\nCreate a clear, engaging, and fully written summary of the specified non-fiction book. The summary should explain the book’s key ideas in a chapter wise format, but the output must be a flowing longform summary, not a list of steps.\n\n⸻\n\n✍️ Requirements:\n\n\nRequirements:\n1. Length & Readability\n\t•\tThe summary should take 20 to 30 minutes to read\n\t•\tTarget word count: 18,000 to 22,000 characters\n\t•\tUse simple, natural language that’s easy to understand\n\t•\tAvoid complex vocabulary, overly poetic phrasing, or academic tone\n  •\tMake length and chapter's content dynamic, if you think any chapters of the book is more important then you can increase the length of that section.\n  •\tcategorize the chapters into their respective themes. If all the concepts of summary are concluded in 8 chapter, then there is no need to be redundant and increase the length. If the necessary information or concept it missing then you can increase the number of chapters to up to 12 in total.\n\n\n2. Originality & Clarity\n\t•\tDo not copy phrases, chapter titles, or structures from the original book\n\t•\tParaphrase deeply and present all ideas in your own words\n\t•\tCreate a fresh and engaging interpretation that’s true to the spirit of the book\n\n3. Content Coverage\n\t•\tCover all key insights, principles, and takeaways\n\t•\tInclude generalized references to examples or stories, but do not retell them in full\n\t•\tEnsure the summary can stand alone and provide full value even to someone who hasn’t read the book(do not mention \"readers\" or similar keywords while generating summaries)\n  • Do not use Author's name for generating summaries like: \"Author's name\" says that, or believes that or wanted to say this.\n  • Add Introduction and the title you should use is \"What You’ll Learn?\". The content of the Introduction should be a quick overview of the book and use 800 to 1200 characters.\n  • Add conclusion section at last. The content of the Conclusion should be key takeaway of the summaries and use bullet points if needed, the length of the conclusion section should be 800 to 1200 characters.\n\n4. Tone & Style\n\t•\tMaintain a neutral, clear, and reflective tone\n\t•\tAvoid jargon unless explained simply\n\t•\tWrite like a helpful guide — friendly, and easy to follow.\n  • Important: Humanize the summaries. Ask a question and then answer when needed, that is the right way to convey a message.\n  • Write in a third-person perspective. Use pronouns like \"He/Him/His\", \"She/Her\", \"It\", or \"They/Them/Their\" whenever required.\n\n5. Flexibility in Layout\n  • Name each chapter with concise, clear, and concrete titles, Avoid poetic, abstract, or overly dramatic names\n\t•\tYou may combine, or rename ideas as needed\n\t•\tStructure the summary as a natural progression of understanding, leading the reader from foundational concepts to deeper insights\n  •\tReflect the original concepts of the books and set the length of the chapters accordingly, if believe the chapter is important and long in the original book then generate more summary for that chapter.\n  •\tAdd a hook at the end of each chapters which is continued in the next chapter\n\n6. Structure: you will find it in the prompt\n"
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "This is the master prompt and I would like you to generate a prompt which generates summaries for the mentioned book:\nObjective: Create a clear, engaging, and fully written summary of the specified non-fiction book. The summary should explain the book’s key ideas in a chapter wise format, but the output must be a flowing longform summary, not a list of steps.\nStructures: Use all of the following structure, smartly merge structures. a. story_wisdom description: Narrative-style walkthrough with storytelling and personal insights Prompt for this structure: Structure the summary as a story-driven walkthrough. Emphasize the author’s journey, key experiences, and lessons. Use a personal, reflective tone. • if you find that chapters are inter related, you can add a descriptions which hooks between chapters. • After introducing the main character in the story, use natural third-person pronouns (he/his) consistently. Avoid repeating the character unless needed for clarity. Maintain fluid and adaptive sentence structure to make the narrative feel human and not robotic.\nBook Name: Rich Dad Poor Dad"
        }
      ]
    },
    {
      "id": "msg_68037199c8908191bc4d920d27fc8aee07a4bc2ce2e4af18",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Certainly! Here’s a prompt tailored to generate a **story-driven, chapter-wise, longform summary** of *Rich Dad Poor Dad*, merging your master prompt with the “story_wisdom” structure and all your formatting, tone, and content requirements:\n\n---\n\n**Prompt for Generating a Story-Driven, Chapter-Wise Summary of \"Rich Dad Poor Dad\":**\n\n---\n\n**Objective:**  \nCreate a clear, engaging, and fully written summary of the book *Rich Dad Poor Dad*. The summary should explain the book’s key ideas in a chapter-wise format, but the output must be a flowing longform summary, not a list of steps or bullet points.\n\n**Instructions:**  \n- Structure the summary as a story-driven walkthrough, following the journey and key experiences presented in the book.  \n- Emphasize the contrast between the two father figures (“rich dad” and “poor dad”) through narrative and personal insights.  \n- Use a natural, reflective, and humanized third-person tone, consistently referring to the main character with “he/his” after the initial introduction.  \n- Integrate hooks at the end of each chapter that naturally lead into the next, especially if the chapters are interrelated.  \n- Maintain a neutral, helpful, and easy-to-understand style.  \n- Paraphrase deeply and avoid copying any phrases or structures from the original book.  \n- Do not use the author’s name or refer to “readers”—focus on the story and lessons.  \n- Avoid jargon unless simply explained.  \n- Each chapter should have a concise, concrete title (not poetic or abstract).  \n- Merge and categorize chapters by themes as needed, with a maximum of 12 chapters.  \n- If a chapter or theme is more important, expand its section accordingly.  \n- Include an **Introduction** titled “What You’ll Learn?” (800–1200 characters) summarizing the core focus of the book.  \n- End with a **Conclusion** (800–1200 characters), summarizing the key takeaways in bullet points if needed.  \n- Target word count: 18,000–22,000 characters (20–30 minute read).  \n- Use simple, natural language throughout.\n\n---\n\n**Prompt:**  \nWrite a longform, story-driven summary of the book *Rich Dad Poor Dad* using the above instructions. Begin with an introduction titled “What You’ll Learn?” (800–1200 characters) that provides a quick overview of the book’s core lessons. Then, structure the summary into chapter-wise sections with clear, concrete titles, following the main character’s journey and the wisdom learned from both “rich dad” and “poor dad.” Present all key insights, principles, and takeaways as a flowing narrative, integrating hooks between chapters where appropriate. Use third-person pronouns after the initial introduction of the main character, and keep the tone neutral, reflective, and easy to follow. Conclude with a summary section (800–1200 characters) highlighting the essential lessons, using bullet points if helpful. Do not copy or refer to the original text, author, or “readers.” Write in your own words, prioritize clarity and engagement, and ensure the summary stands alone as a helpful guide.\n\n---\n\n**End of Prompt**"
        }
      ]
    }
  ],
  text: {
    "format": {
      "type": "text"
    }
  },
  reasoning: {},
  tools: [],
  temperature: 0.55,
  max_output_tokens: 4048,
  top_p: 1,
  store: true
});


// System Message:
// This is the master prompt and I would like you to generate a  prompt which generates summaries for the mentioned book:

//  Objective:
// Create a clear, engaging, and fully written summary of the specified non-fiction book. The summary should explain the book’s key ideas in a chapter wise format, but the output must be a flowing longform summary, not a list of steps.

// ⸻

// ✍️ Requirements:

// 1. Length & Readability
// 	•	Target word count: 18,000 to 22,000 characters
// 	•	Use simple, natural language that’s easy to understand
// 	•	Avoid complex vocabulary, overly poetic phrasing, or academic tone
//   •	Make length and chapter's content dynamic, if you think any chapters of the book is more important then you can increase the length of that section.
//   •	categorize the chapters into their respective themes. Conclude all concepts in total of 8 chapters.


// 2. Originality & Clarity
// 	•	Do not copy phrases, chapter titles, or structures from the original book
// 	•	Paraphrase deeply and present all ideas in your own words
// 	•	Create a fresh and engaging interpretation that’s true to the spirit of the book

// 3. Content Coverage
// 	•	Cover all key insights, principles, and takeaways
// 	•	Include generalized references to examples or stories, but do not retell them in full
// 	•	Ensure the summary can stand alone and provide full value even to someone who hasn’t read the book(do not mention "readers" or similar keywords while generating summaries)
//   • Do not use Author's name for generating summaries like: "Author's name" says that, or believes that or wanted to say this.
//   • Add one Introduction section: Purpose: Set expectations for the reader — explain what they’ll learn and why this book matters, Then transition smoothly into Chapters.
// • Avoid repetitive use of the same subject nouns (e.g., “the boy”, “the author”, “the reader”).Use pronouns like he, she, or they where the subject is already clear.

// 4. Tone & Style
// 	•	Maintain a neutral, clear, and reflective tone
// 	•	Avoid jargon unless explained simply
// 	•	Write like a helpful guide — friendly, and easy to follow.
//   • Important: Humanize the summaries. Ask a question and then answer when needed, that is the right way to convey a message.

// 5. Flexibility in Layout
//   • Name each chapter with concise, clear, and concrete titles, Avoid poetic, abstract, or overly dramatic names
// 	•	You may combine, or rename ideas as needed
// 	•	Structure the summary as a natural progression of understanding, leading the reader from foundational concepts to deeper insights
//   •	Reflect the original concepts of the books and set the length of the chapters accordingly, if believe the chapter is important and long in the original book then generate more summary for that chapter

// 6. Structure: you will find it in the prompt

// User Prompt:
// This is the master prompt and I would like you to generate a prompt which generates summaries for the mentioned book:

// Objective: Create a clear, engaging, and fully written summary of the specified non-fiction book. The summary should explain the book’s key ideas in a chapter wise format, but the output must be a flowing longform summary, not a list of steps.

// Structures: Use all of the following structure, smartly merge structures. a. story_wisdom 
// description: Narrative-style walkthrough with storytelling and personal insights. 
// Prompt for this structure: Structure the summary as a story-driven walkthrough. Emphasize the author’s journey, key experiences, and lessons. Use a personal, reflective tone. • if you find that chapters are inter related, you can add a descriptions which hooks between chapters. • After introducing the main character in the story, use natural third-person pronouns (he/his) consistently. Avoid repeating the character unless needed for clarity. Maintain fluid and adaptive sentence structure to make the narrative feel human and not robotic. 

// Book Name: Rich Dad Poor Dad

// OUTPUT:

// Certainly! Here’s a prompt tailored to generate a story-driven, chapter-wise, longform summary of Rich Dad Poor Dad, merging your master prompt with the “story_wisdom” structure and all your formatting, tone, and content requirements:

// Prompt for Generating a Story-Driven, Chapter-Wise Summary of "Rich Dad Poor Dad":

// Objective:
// Create a clear, engaging, and fully written summary of the book Rich Dad Poor Dad. The summary should explain the book’s key ideas in a chapter-wise format, but the output must be a flowing longform summary, not a list of steps or bullet points.

// Instructions:

// Structure the summary as a story-driven walkthrough, following the journey and key experiences presented in the book.
// Emphasize the contrast between the two father figures (“rich dad” and “poor dad”) through narrative and personal insights.
// Use a natural, reflective, and humanized third-person tone, consistently referring to the main character with “he/his” after the initial introduction.
// Integrate hooks at the end of each chapter that naturally lead into the next, especially if the chapters are interrelated.
// Maintain a neutral, helpful, and easy-to-understand style.
// Paraphrase deeply and avoid copying any phrases or structures from the original book.
// Do not use the author’s name or refer to “readers”—focus on the story and lessons.
// Avoid jargon unless simply explained.
// Each chapter should have a concise, concrete title (not poetic or abstract).
// Merge and categorize chapters by themes as needed, with a maximum of 12 chapters.
// If a chapter or theme is more important, expand its section accordingly.
// Include an Introduction titled “What You’ll Learn?” (800–1200 characters) summarizing the core focus of the book.
// End with a Conclusion (800–1200 characters), summarizing the key takeaways in bullet points if needed.
// Target word count: 18,000–22,000 characters (20–30 minute read).
// Use simple, natural language throughout.
// Prompt:
// Write a longform, story-driven summary of the book Rich Dad Poor Dad using the above instructions. Begin with an introduction titled “What You’ll Learn?” (800–1200 characters) that provides a quick overview of the book’s core lessons. Then, structure the summary into chapter-wise sections with clear, concrete titles, following the main character’s journey and the wisdom learned from both “rich dad” and “poor dad.” Present all key insights, principles, and takeaways as a flowing narrative, integrating hooks between chapters where appropriate. Use third-person pronouns after the initial introduction of the main character, and keep the tone neutral, reflective, and easy to follow. Conclude with a summary section (800–1200 characters) highlighting the essential lessons, using bullet points if helpful. Do not copy or refer to the original text, author, or “readers.” Write in your own words, prioritize clarity and engagement, and ensure the summary stands alone as a helpful guide.

