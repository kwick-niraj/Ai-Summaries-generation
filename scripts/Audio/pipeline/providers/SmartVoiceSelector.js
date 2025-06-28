import { VoiceSelectionProvider } from './VoiceSelectionProvider.js';

/**
 * Smart voice selection provider with enhanced gender detection and content analysis
 */
export class SmartVoiceSelector extends VoiceSelectionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'smart';
    
    // Scoring weights for voice selection
    this.scoringWeights = {
      AUTHOR_GENDER: 40,      // Primary factor as requested
      GENRE_MATCH: 25,        // Based on category taxonomy
      CONTENT_STYLE: 20,      // From style_tone and narrative_style
      TARGET_AUDIENCE: 10,    // Professional vs general
      BOOK_TONE: 5           // Motivational, authoritative, etc.
    };

    // Default fallback voice as specified
    this.defaultVoice = 'alloy-turbo-multilingual'; // maps to en-US-AlloyTurboMultilingualNeural

    // Initialize genre mapping based on provided taxonomy
    this.initializeGenreMapping();
    
    // Initialize comprehensive gender detection
    this.initializeGenderDetection();
  }

  /**
   * Smart provider is always available
   * @returns {Promise<boolean>} Always true
   */
  async isAvailable() {
    return true;
  }

  /**
   * Select optimal voice using smart algorithm
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoice(metadata) {
    try {
      console.log(`🧠 Using Smart voice selection: "${metadata.title}"`);
      
      const analysis = this.analyzeBookCharacteristics(metadata);
      const selectedVoice = this.selectOptimalVoice(analysis, metadata);
      
      return this.formatResult(
        selectedVoice.name,
        metadata,
        selectedVoice.confidence,
        selectedVoice.reasoning
      );

    } catch (error) {
      console.error('Smart voice selection failed:', error);
      // Ultimate fallback - use default voice
      return this.formatResult(
        this.defaultVoice, 
        metadata, 
        60, 
        'Ultimate fallback to default voice'
      );
    }
  }

  /**
   * Initialize genre mapping based on provided taxonomy
   */
  initializeGenreMapping() {
    this.genreMapping = {
      // Business & Professional Categories
      'Business': ['business', 'professional', 'corporate'],
      'Entrepreneurship': ['business', 'leadership', 'motivational'],
      'Marketing & Sales': ['business', 'professional', 'presentations'],
      'Management & Leadership': ['leadership', 'business', 'professional'],
      'Corporate Culture': ['business', 'professional', 'corporate'],
      'Money & Investments': ['business', 'professional', 'authoritative'],
      'Economics': ['business', 'professional', 'academic'],
      'Career & Success': ['business', 'professional', 'motivational'],

      // Personal Development & Life
      'Self-Help': ['self-help', 'personal-development', 'motivational'],
      'Motivation & Inspiration': ['motivational', 'inspirational', 'dynamic'],
      'Personal': ['personal-development', 'self-help', 'general'],
      'Life': ['general-purpose', 'personal-development', 'storytelling'],

      // Educational & Learning
      'Learning': ['educational', 'accessible', 'clear'],
      'Education': ['educational', 'academic', 'professional'],
      'Communication Skills': ['professional', 'business', 'training'],
      'Philosophy': ['intellectual', 'thoughtful', 'academic'],

      // Science & Technology
      'Science & Non-Fiction': ['academic', 'authoritative', 'documentary'],
      'Science': ['academic', 'authoritative', 'professional'],
      'Technology & the Future': ['technology', 'innovation', 'professional'],
      'Psychology': ['academic', 'professional', 'wellness'],

      // Wellness & Mindfulness
      'Mindfulness & Happiness': ['wellness', 'mindfulness', 'healing'],
      'Health & Nutrition': ['wellness', 'healing', 'professional'],
      'Religion & Spirituality': ['spiritual', 'wellness', 'thoughtful'],

      // Creative & Narrative
      'Biography & Memoir': ['biography', 'narrative', 'storytelling'],
      'Literature': ['narrative', 'storytelling', 'artistic'],
      'Fiction': ['storytelling', 'narrative', 'creative'],
      'Creativity': ['creative', 'inspirational', 'artistic'],

      // Social & Cultural
      'Society': ['documentary', 'authoritative', 'academic'],
      'Politics': ['authoritative', 'documentary', 'serious'],
      'Society & Culture': ['documentary', 'narrative', 'thoughtful'],
      'History': ['documentary', 'authoritative', 'narrative'],
      'Historical': ['documentary', 'authoritative', 'narrative'],

      // Other categories
      'Parenting': ['general-audience', 'accessible', 'caring'],
      'Sex & Relationships': ['personal-development', 'accessible', 'caring'],
      'Travel': ['narrative', 'storytelling', 'accessible'],
      'Nature & the Environment': ['documentary', 'thoughtful', 'narrative']
    };
  }

  /**
   * Initialize comprehensive gender detection
   */
  initializeGenderDetection() {
    this.maleNames = new Set([
      // Common first names
      'Robert', 'John', 'Michael', 'David', 'James', 'William', 'Richard', 'Charles', 
      'Thomas', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 
      'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 
      'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 
      'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 
      'Frank', 'Gregory', 'Raymond', 'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry', 
      'Tyler', 'Aaron', 'Jose', 'Henry', 'Adam', 'Douglas', 'Nathan', 'Peter', 'Zachary', 
      'Kyle', 'Noah', 'Alan', 'Ethan', 'Jeremy', 'Lionel', 'Wayne', 'Bruce', 'Roger', 
      'Chris', 'Christopher', 'Sean', 'Carl', 'Harold', 'Arthur', 'Lawrence', 'Jordan',
      'Louis', 'Philip', 'Mason', 'Elijah', 'Wayne', 'Roy', 'Eugene', 'Louis', 'Ralph',
      'Bobby', 'Russell', 'Louis', 'Philip', 'Johnny', 'Mason', 'Elijah', 'Wayne',
      
      // Business/Author specific names
      'Tony', 'Tim', 'Steve', 'Bill', 'Dave', 'Mike', 'Jim', 'Tom', 'Dan', 'Ben',
      'Matt', 'Andy', 'Joe', 'Sam', 'Max', 'Alex', 'Nick', 'Josh', 'Jake', 'Luke',
      'Marcus', 'Simon', 'Oliver', 'Harry', 'Leo', 'Oscar', 'Felix', 'Hugo', 'Theo',
      'Sebastian', 'Maximilian', 'Augustus', 'Cornelius', 'Bartholomew', 'Montgomery'
    ]);

    this.femaleNames = new Set([
      // Common first names
      'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 
      'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 
      'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Dorothy', 
      'Amy', 'Angela', 'Ashley', 'Brenda', 'Emma', 'Olivia', 'Cynthia', 'Marie', 'Janet', 
      'Catherine', 'Frances', 'Christine', 'Samantha', 'Debra', 'Rachel', 'Carolyn', 
      'Janet', 'Virginia', 'Maria', 'Heather', 'Diane', 'Julie', 'Joyce', 'Victoria', 
      'Kelly', 'Christina', 'Joan', 'Evelyn', 'Lauren', 'Judith', 'Megan', 'Cheryl', 
      'Andrea', 'Hannah', 'Jacqueline', 'Martha', 'Gloria', 'Sara', 'Janice', 'Kathryn', 
      'Anne', 'Kathy', 'Alice', 'Teresa', 'Doris', 'Jean', 'Shirley', 'Wanda', 'Judy',
      'Lori', 'Beverly', 'Denise', 'Tammy', 'Irene', 'Jane', 'Lois', 'Gloria', 'Tina',
      
      // Business/Author specific names
      'Oprah', 'Brené', 'Sheryl', 'Melinda', 'Arianna', 'Susan', 'Amy', 'Tara', 'Gretchen',
      'Elizabeth', 'Marie', 'Anne', 'Jane', 'Kate', 'Grace', 'Hope', 'Faith', 'Joy',
      'Sophia', 'Isabella', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily',
      'Ella', 'Scarlett', 'Madison', 'Eleanor', 'Aria', 'Luna', 'Chloe', 'Penelope',
      'Layla', 'Riley', 'Zoey', 'Nora', 'Lily', 'Ellie', 'Violet', 'Lillian', 'Zoe'
    ]);

    // Gender indicators in names
    this.maleIndicators = ['Jr.', 'Sr.', 'III', 'IV', 'Mr.'];
    this.femaleIndicators = ['Ms.', 'Mrs.', 'Dr.'];
  }

  /**
   * Analyze book characteristics for voice selection
   * @param {Object} metadata - Book metadata
   * @returns {Object} Analysis result
   */
  analyzeBookCharacteristics(metadata) {
    const analysis = {
      authorGender: this.detectAuthorGender(metadata.author),
      genres: this.normalizeGenres(metadata.genre || []),
      themes: metadata.core_themes || [],
      targetAudience: metadata.target_audience || [],
      tone: this.inferBookTone(metadata),
      contentStyle: this.inferContentStyle(metadata),
      authorityLevel: this.inferAuthorityLevel(metadata),
      narrativeStyle: this.extractNarrativeStyle(metadata)
    };

    console.log(`📊 Book Analysis for "${metadata.title}":`, {
      authorGender: analysis.authorGender,
      genres: analysis.genres,
      tone: analysis.tone,
      contentStyle: analysis.contentStyle
    });

    return analysis;
  }

  /**
   * Enhanced author gender detection
   * @param {string|Array} author - Author name(s)
   * @returns {string} Detected gender or 'unknown'
   */
  detectAuthorGender(author) {
    if (!author) return 'unknown';

    // Handle array of authors
    if (Array.isArray(author)) {
      const genders = author.map(a => this.detectSingleAuthorGender(a));
      const maleCount = genders.filter(g => g === 'male').length;
      const femaleCount = genders.filter(g => g === 'female').length;
      
      // If majority is one gender, use that
      if (maleCount > femaleCount) return 'male';
      if (femaleCount > maleCount) return 'female';
      
      // If mixed or unknown, return unknown
      return 'unknown';
    }

    return this.detectSingleAuthorGender(author);
  }

  /**
   * Detect gender for a single author
   * @param {string} authorName - Single author name
   * @returns {string} Detected gender
   */
  detectSingleAuthorGender(authorName) {
    if (!authorName || typeof authorName !== 'string') return 'unknown';

    const name = authorName.trim();
    
    // Check for gender indicators
    for (const indicator of this.maleIndicators) {
      if (name.includes(indicator)) return 'male';
    }
    for (const indicator of this.femaleIndicators) {
      if (name.includes(indicator)) return 'female';
    }

    // Extract first name (handle formats like "Last, First" or "First Last")
    let firstName = '';
    if (name.includes(',')) {
      // Format: "Last, First Middle"
      const parts = name.split(',');
      if (parts.length > 1) {
        firstName = parts[1].trim().split(' ')[0];
      }
    } else {
      // Format: "First Middle Last"
      firstName = name.split(' ')[0];
    }

    // Clean first name
    firstName = firstName.replace(/[^a-zA-Z]/g, '');

    // Check against name databases
    if (this.maleNames.has(firstName)) return 'male';
    if (this.femaleNames.has(firstName)) return 'female';

    // Additional heuristics for common patterns
    if (firstName.endsWith('a') && firstName.length > 3) {
      // Many female names end in 'a' (Maria, Linda, etc.)
      return 'female';
    }

    return 'unknown';
  }

  /**
   * Select optimal voice based on analysis
   * @param {Object} analysis - Book analysis
   * @param {Object} metadata - Original metadata
   * @returns {Object} Selected voice with confidence and reasoning
   */
  selectOptimalVoice(analysis, metadata) {
    const voices = this.getVoiceCharacteristics();
    
    // If author gender is unknown, use default voice
    if (analysis.authorGender === 'unknown') {
      console.log(`🎯 Using default voice for unknown gender: ${this.defaultVoice}`);
      return {
        name: this.defaultVoice,
        confidence: 75,
        reasoning: 'Default voice for unknown author gender'
      };
    }

    // Filter voices by gender first (primary requirement)
    const genderFilteredVoices = Object.entries(voices).filter(([name, data]) => 
      data.gender === analysis.authorGender
    );

    if (genderFilteredVoices.length === 0) {
      console.log(`⚠️ No voices found for gender ${analysis.authorGender}, using default`);
      return {
        name: this.defaultVoice,
        confidence: 60,
        reasoning: `No ${analysis.authorGender} voices available, using default`
      };
    }

    // Score each gender-appropriate voice
    const candidates = [];
    for (const [voiceName, voiceData] of genderFilteredVoices) {
      const score = this.calculateVoiceScore(voiceData, analysis);
      candidates.push({
        name: voiceName,
        characteristics: voiceData,
        score: score.total,
        reasoning: score.reasoning
      });
    }

    // Sort by score and select the best match
    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates[0];

    console.log(`🎯 Selected voice: ${selected.name} (${selected.score}% match)`);
    console.log(`📝 Reasoning: ${selected.reasoning}`);

    return {
      name: selected.name,
      characteristics: selected.characteristics,
      confidence: Math.min(95, Math.max(70, selected.score)),
      reasoning: selected.reasoning || 'Smart algorithm selection'
    };
  }

  /**
   * Calculate voice score based on analysis
   * @param {Object} voiceData - Voice characteristics
   * @param {Object} analysis - Book analysis
   * @returns {Object} Score and reasoning
   */
  calculateVoiceScore(voiceData, analysis) {
    let score = 50; // Base score (gender already matched)
    const reasons = [];

    // Genre matching (25% weight)
    const genreMatches = this.findGenreMatches(analysis.genres, voiceData.bestFor);
    if (genreMatches.length > 0) {
      const genreScore = Math.min(25, genreMatches.length * 8);
      score += genreScore;
      reasons.push(`Genre match: ${genreMatches.join(', ')} (+${genreScore})`);
    }

    // Content style matching (20% weight)
    const styleScore = this.calculateStyleScore(voiceData, analysis);
    if (styleScore > 0) {
      score += styleScore;
      reasons.push(`Style match (+${styleScore})`);
    }

    // Target audience matching (10% weight)
    const audienceScore = this.calculateAudienceScore(voiceData, analysis);
    if (audienceScore > 0) {
      score += audienceScore;
      reasons.push(`Audience match (+${audienceScore})`);
    }

    // Book tone matching (5% weight)
    const toneScore = this.calculateToneScore(voiceData, analysis);
    if (toneScore > 0) {
      score += toneScore;
      reasons.push(`Tone match (+${toneScore})`);
    }

    // Authority level bonus
    if (analysis.authorityLevel === 'high' && 
        ['adam-multilingual', 'derek-multilingual', 'amanda-multilingual'].includes(voiceData.azureVoiceId?.toLowerCase())) {
      score += 5;
      reasons.push('Authority bonus (+5)');
    }

    return {
      total: Math.min(100, score),
      reasoning: reasons.join('; ') || 'Gender-based selection'
    };
  }

  /**
   * Calculate style matching score
   * @param {Object} voiceData - Voice characteristics
   * @param {Object} analysis - Book analysis
   * @returns {number} Style score
   */
  calculateStyleScore(voiceData, analysis) {
    let score = 0;

    // Narrative style matching
    if (analysis.narrativeStyle === 'story-driven' && voiceData.personality === 'narrator') {
      score += 15;
    }
    if (analysis.narrativeStyle === 'conversational' && voiceData.personality === 'conversational') {
      score += 12;
    }
    if (analysis.contentStyle === 'professional' && voiceData.style === 'professional') {
      score += 10;
    }
    if (analysis.contentStyle === 'friendly' && voiceData.style === 'friendly') {
      score += 8;
    }

    return Math.min(20, score);
  }

  /**
   * Calculate audience matching score
   * @param {Object} voiceData - Voice characteristics
   * @param {Object} analysis - Book analysis
   * @returns {number} Audience score
   */
  calculateAudienceScore(voiceData, analysis) {
    let score = 0;

    const audienceText = analysis.targetAudience.join(' ').toLowerCase();
    
    if (audienceText.includes('professional') && voiceData.bestFor.includes('professional')) {
      score += 8;
    }
    if (audienceText.includes('business') && voiceData.bestFor.includes('business')) {
      score += 6;
    }
    if (audienceText.includes('general') && voiceData.bestFor.includes('general-purpose')) {
      score += 4;
    }

    return Math.min(10, score);
  }

  /**
   * Calculate tone matching score
   * @param {Object} voiceData - Voice characteristics
   * @param {Object} analysis - Book analysis
   * @returns {number} Tone score
   */
  calculateToneScore(voiceData, analysis) {
    let score = 0;

    if (analysis.tone === 'authoritative' && voiceData.tone === 'deep') {
      score += 4;
    }
    if (analysis.tone === 'inspiring' && voiceData.tone === 'energetic') {
      score += 3;
    }
    if (analysis.tone === 'gentle' && voiceData.tone === 'empathetic') {
      score += 3;
    }

    return Math.min(5, score);
  }

  /**
   * Find matching genres between book and voice
   * @param {Array} bookGenres - Book genres
   * @param {Array} voiceBestFor - Voice best-for categories
   * @returns {Array} Matching categories
   */
  findGenreMatches(bookGenres, voiceBestFor) {
    const matches = [];
    
    for (const genre of bookGenres) {
      const mappedCategories = this.genreMapping[genre] || [];
      for (const category of mappedCategories) {
        if (voiceBestFor.includes(category)) {
          matches.push(category);
        }
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Normalize genre names for consistent matching
   * @param {Array} genres - Array of genre strings
   * @returns {Array} Normalized genres
   */
  normalizeGenres(genres) {
    if (!Array.isArray(genres)) return [];
    
    return genres.map(genre => 
      typeof genre === 'string' ? genre.trim() : String(genre).trim()
    ).filter(genre => genre.length > 0);
  }

  /**
   * Infer book tone from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Inferred tone
   */
  inferBookTone(metadata) {
    const title = (metadata.title || '').toLowerCase();
    const themes = (metadata.core_themes || []).join(' ').toLowerCase();
    const purpose = (metadata.primary_purpose || '').toLowerCase();
    const styleTone = (metadata.style_tone || []).join(' ').toLowerCase();

    if (styleTone.includes('motivational') || themes.includes('motivational')) {
      return 'inspiring';
    }
    if (styleTone.includes('authoritative') || purpose.includes('challenge')) {
      return 'authoritative';
    }
    if (styleTone.includes('empathetic') || themes.includes('wellness')) {
      return 'gentle';
    }
    if (styleTone.includes('conversational') || styleTone.includes('friendly')) {
      return 'conversational';
    }

    return 'balanced';
  }

  /**
   * Infer content style from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Content style
   */
  inferContentStyle(metadata) {
    const styleTone = (metadata.style_tone || []).join(' ').toLowerCase();
    const structure = metadata.structure_format || {};
    const narrativeStyle = (structure.narrative_style || '').toLowerCase();

    if (narrativeStyle.includes('story') || narrativeStyle.includes('anecdotal')) {
      return 'narrative';
    }
    if (styleTone.includes('conversational')) {
      return 'conversational';
    }
    if (styleTone.includes('professional') || styleTone.includes('straightforward')) {
      return 'professional';
    }
    if (styleTone.includes('friendly') || styleTone.includes('warm')) {
      return 'friendly';
    }

    return 'balanced';
  }

  /**
   * Extract narrative style from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Narrative style
   */
  extractNarrativeStyle(metadata) {
    const structure = metadata.structure_format || {};
    const narrativeStyle = (structure.narrative_style || '').toLowerCase();

    if (narrativeStyle.includes('story') || narrativeStyle.includes('anecdotal')) {
      return 'story-driven';
    }
    if (narrativeStyle.includes('conversational')) {
      return 'conversational';
    }
    if (narrativeStyle.includes('direct') || narrativeStyle.includes('straightforward')) {
      return 'direct';
    }

    return 'balanced';
  }

  /**
   * Infer authority level from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Authority level
   */
  inferAuthorityLevel(metadata) {
    const reception = (metadata.reception_impact || []).join(' ').toLowerCase();
    const genres = this.normalizeGenres(metadata.genre || []);
    
    if (reception.includes('bestseller') || reception.includes('million copies')) {
      return 'high';
    }
    
    const businessGenres = ['Business', 'Management & Leadership', 'Economics', 'Money & Investments'];
    if (genres.some(g => businessGenres.includes(g))) {
      return 'high';
    }

    return 'medium';
  }
}

export default SmartVoiceSelector;
