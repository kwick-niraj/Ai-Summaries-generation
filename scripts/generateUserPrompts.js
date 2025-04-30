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
  const metaTone = StyleTone.length > 0 ? StyleTone.join(', ') : "neutral, clear, and accessible";
  const toneAndStructure = summaryToneAndStructure;

  const tone = `${toneAndStructure.structure_type}, story_wisdom, tactical_breakdown, ${metaTone}`


  // 🧱 Bullet rules
  const bulletRule = "sparingly for summarizing grouped tools, techniques, or insights — not for every section";

  // 🧱 Summary Strategy (flexible, genre-agnostic)
  // const summaryStrategy = `Summary Type: ${toneAndStructure.structure_type}.\nDescription: ${toneAndStructure.description} ${toneAndStructure.structure}`;

  const summaryStrategy = ` Mixed: framework_stepwise 60% + story_wisdom 25% + tactical_breakdown 15%

Description:
Use the following structure configuration to guide the summary writing process. Apply each style proportionally based on its weight and purpose, blending them seamlessly throughout the chapters.

• 60% of the summary should follow the **“framework_stepwise”** structure — Summarize the book using a structured, principle-by-principle flow. Each chapter should cover one or more related steps, ideas, or habits. Begin with a clear theme, then explain the concept using metaphors or simplified explanations. Maintain a logical order and use a calm, instructive tone written in third person.

• 25% of the summary should follow the **“story_wisdom”** structure — Structure the summary as a flowing narrative that uses emotionally engaging storytelling to deliver key insights. Use broad, relatable scenarios to illustrate each key idea. You may use generalized, non-specific archetypes (e.g., “a manager”, “a shy student”), but avoid creating named characters or detailed fictional backstories. Include clear, paraphrased examples or everyday situations to support key concepts and make them more relatable. Avoid full retellings or fictional anecdotes. Use natural, third-person narration and keep the tone reflective, warm, and human.

• 15% of the summary should follow the **“tactical_breakdown”** structure — Structure the summary as a clear, practical walkthrough of the book’s strategies. Each chapter should cover a core idea or principle and explain how it works in real-life situations. Write in a clear, third-person, instructional tone. While the summary itself should flow in paragraphs, any actionable steps, techniques, or tools mentioned within a chapter should be listed using bullet points for clarity. Avoid second-person language (“you”), and use general, relatable examples to ground the advice. Keep the language simple, direct, and helpful.

Avoid dividing the three styles into separate sections. Instead, let the structured progression lead, enrich it with brief storytelling, and reinforce it with concise tactics where appropriate. The final summary should feel purposeful, practical, and human in tone and flow.
`

  // 🧱 Avoid list (dynamic + generic)
  const avoid = [
    "Second-person language (e.g., 'you', 'your')",
    `Mentioning the author directly (e.g., '${author} says...', '${author} believes...')`,
    "Overuse of bullet points or generic list formatting",
    "Reusing original chapter titles or structure from the book",
    "Copying or closely imitating the book’s own phrasing or section names"
  ];


  return `
You are a professional nonfiction book summarizer.

Your job is to generate a flowing, clear, deeply paraphrased summary of the following nonfiction book using the metadata and the formatting rules provided.

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
• Tone: ${tone}
• Voice: third-person only
• Style: conversational, simple, and practical
• Bullet Points: ${bulletRule}
• Target Length: 22,000–25,000 characters

🚫 Avoid:
• ${avoid.join('\n• ')}

⚠️ Additional Instructions:
• Create concise, simple, and clear section titles. Each title should describe the core theme of the section using plain language (10-15 words max). Avoid poetic phrases, vague abstractions, or metaphors. Do not reuse or quote original chapter titles from the book.
• Paraphrase deeply — no direct quotes
• Use metadata to guide summary focus, tone, and order — do not invent structure
• Ensure smooth transitions between sections and avoid isolated blocks

You are generating the ${isFirstHalf ? 'first' : 'second'} half of a complete longform summary. The half summary will be approximately 22,000–25,000 characters across 4-5 chapters.

In this half, include only 4–5 chapters, adjusted to match the same level of depth, detail, and character count as you would in a full-length summary. Do not shorten content — only reduce the number of chapters. The tone, structure, and pacing must remain consistent.

Wait for or build upon the other half accordingly.
`.trim();
}

module.exports = {
  generateUserPrompt,
}