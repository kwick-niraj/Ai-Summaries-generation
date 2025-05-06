function generateUserPrompt(meta, summaryToneAndStructure, isFirstHalf = true) {
  const {
    title,
    author,
    publication_date,
    genre = [],
    target_audience = [],
    "core_themes": CoreThemes = [],
    "key_concepts_lessons": KeyConcepts = [],
    "primary_purpose": PrimaryPurpose = '',
    "structure_format": StructureFormat = {},
    "style_tone": StyleTone = [],
    "notable_features": NotableFeatures = []
  } = meta;

  // 🧱 Structure
  let structureLine = "7–9 narrative-driven thematic sections.";
  if (StructureFormat?.Organization?.toLowerCase().includes("chapter") || StructureFormat?.Organization?.toLowerCase().includes("tip")) {
    structureLine += " Group related chapters, tips, or ideas into cohesive themes.";
  }
  structureLine += " Include a short Introduction (~800–1000 characters). Include a Conclusion (~800–1000 characters).";

  // 🧱 Tone
  // const metaTone = StyleTone.length > 0 ? StyleTone.join(', ') : "natural, clear, and accessible";
  const toneAndStructure = summaryToneAndStructure;

  // const tone = `story_wisdom, tactical_breakdown, ${metaTone}`
  // const tone = metaTone;


  // 🧱 Bullet rules
  const bulletRule = "sparingly for summarizing grouped tools, techniques, or insights — not for every section";

  // 🧱 Summary Strategy (flexible, genre-agnostic)
  // const summaryStrategy = `Summary Type: ${toneAndStructure.structure_type}.\nDescription: ${toneAndStructure.description} ${toneAndStructure.structure}`;

  const summaryStrategy = `
  {

  "structure_type": "framework_stepwise",
  
  "description": "Use this strategy to summarize books that present a structured methodology, system, or set of principles. The summary should progress step-by-step in a clear, logical flow that mirrors the original framework or sequential argument of the book. This structure is ideal for books about productivity, business, health, learning, or behavioral change.",
  
  "prompt": "Summarize the book using a structured, principle-by-principle flow. Each chapter should cover one or more related steps, ideas, or habits. Start by clearly defining the theme or principle of that chapter. Then, explain the concept in simplified, logical terms using analogies, metaphors, or relatable thought experiments when needed. Use short, real-life examples to demonstrate how the principle works in action — these can be paraphrased or generalized but must be relevant.\n\nEnsure the summary maintains a logical progression: early chapters should introduce foundational ideas, while later ones build complexity or deepen practical understanding. Link concepts where appropriate to show interdependence.\nEmphasize practical understanding over literary style. Avoid fragmenting insights — keep the flow continuous.\n\nWhen the original book presents visual or conceptual frameworks (e.g., loops, matrices, pyramids), describe them simply so they are mentally visualizable. Summarize tools, models, or checklists naturally within the paragraph flow or as short bullet lists where necessary.\n\nThe overall goal is to teach the core logic and usability of the framework clearly and sequentially — as if helping someone implement the method in real life, step by step.",

  "tone": "Use a story-driven tone that feels like each principle is being uncovered through meaningful experience. Begin sections with real-world moments or reflective situations where the need for a given principle becomes obvious. Rather than a detached mentor, the voice should feel like someone walking through the lessons from lived trial-and-error — learning alongside the reader. Blend instruction with light storytelling and internal realizations. Prioritize relatability, transformation, and natural clarity over formal exposition or motivation. Let the structure emerge as the path someone walked to find what works.",

  "technique_integration": "If there are clearly named or structured techniques (e.g., rules, steps, methods, or frameworks), include them as brief, well-placed bullet points at the moment they emerge naturally in the narrative. Do not isolate them into a separate section. Introduce them gently with transitions. Paraphrase both the language and any original metaphors to keep the expression fresh and natural. Keep each point concise (2–5 lines max) and use accessible, human-centered wording. The goal is to blend clarity with emotional and conceptual flow, without referring to the book or its author directly."


}

`
// • 5% of the summary should follow the **“tactical_breakdown”** structure — Structure the summary as a clear, practical walkthrough of the book’s strategies. Each chapter should cover a core idea or principle and explain how it works in real-life situations. Write in a clear, third-person, instructional tone. While the summary itself should flow in paragraphs, any actionable steps, techniques, or tools mentioned within a chapter should be listed using bullet points for clarity. Avoid second-person language (“you”), and use general, relatable examples to ground the advice. Keep the language simple, direct, and helpful.

// Avoid treating the styles as separate sections. Let them blend naturally within each chapter.

  // 🧱 Avoid list (dynamic + generic)
  const avoid = [
    "Using words like (e.g., 'you', 'your')",
    `Mentioning the author directly (e.g., '${author} says...', '${author} believes...')`,
    "Overuse of bullet points or generic list formatting",
    "Reusing original chapter titles from the book",
    "Copying or closely imitating the book’s own phrasing or section names",
    "Jargon or complex vocabulary",
    "over-fictionalizing or introducing narrative embellishments that misrepresent real events or teachings. When describing characters (e.g., mentors, parents, friends), refer to their roles based on how they function in the author’s life, not how they could be dramatized."
  ];

//  • Bullet Points: ${bulletRule}

  return `
You are a professional nonfiction book summarizer.

Your job is to generate a natural, flowing, clear, engaging and deeply paraphrased summary of the following nonfiction book using the metadata and the formatting rules provided.

⸻

📘 Book Metadata:
• Title: ${title}
• Author: ${author}
• Genre: ${genre.join(', ')}
• First Published: ${publication_date}
• Target Audience: ${target_audience.join(', ')}

🎯 Primary Purpose:
${PrimaryPurpose}

🔑 Core Themes:
${CoreThemes.join(', ')}

🧠 Key Concepts:
${KeyConcepts.join(', ')}

📐 Structure:
${structureLine}

📝 Summary Strategy:
${summaryStrategy}

🎯 Writing Guidelines:
• Voice: Use a combination of second-person and  third-person voice
• Target Length: 22,000–25,000 characters

🚫 Avoid:
• ${avoid.join('\n• ')}

⚠️ Additional Instructions:
• Create concise, simple, and clear section titles. Each title should describe the core theme of the section using plain language (10-15 words max). Avoid poetic phrases, vague abstractions, or metaphors.
• Paraphrase deeply — no direct quotes
• Use metadata to guide summary focus, tone, and order — do not invent structure
• Ensure smooth transitions between sections and avoid isolated blocks
•	Preserve the 80% logical flow of concepts as in the original book.
•	Maintain factual alignment with the book’s original structure and narrative. Do not invent or exaggerate relationships, story setups, or character roles.s

You are generating the ${isFirstHalf ? 'first' : 'second'} half of a complete longform summary. The half summary will be approximately 22,000–25,000 characters across 4-5 chapters.

In this half, include only 4–5 chapters, adjusted to match the same level of depth, detail, and character count as you would in a full-length summary. Do not shorten content — only reduce the number of chapters. The tone, structure, and pacing must remain consistent.

Wait for or build upon the other half accordingly.
`.trim();
}

module.exports = {
  generateUserPrompt,
}