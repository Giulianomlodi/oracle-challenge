import { generateDailyTopics, generateTopic, formatTopicPost } from '../../../src/game/predictor';

describe('Predictor - generateDailyTopics', () => {
  it('should generate specified number of topics', () => {
    const topics = generateDailyTopics(5);
    expect(topics).toHaveLength(5);
  });

  it('should generate 3 topics by default', () => {
    const topics = generateDailyTopics();
    expect(topics).toHaveLength(3);
  });

  it('should return topics with required properties', () => {
    const topics = generateDailyTopics(1);
    const topic = topics[0];
    
    expect(topic).toHaveProperty('title');
    expect(topic).toHaveProperty('description');
    expect(topic).toHaveProperty('category');
    expect(topic).toHaveProperty('deadline');
  });

  it('should generate topics with different categories when possible', () => {
    const topics = generateDailyTopics(3);
    const categories = topics.map(t => t.category);
    const uniqueCategories = new Set(categories);
    
    // At least 2 different categories in 3 topics
    expect(uniqueCategories.size).toBeGreaterThanOrEqual(2);
  });

  it('should generate topics with valid deadline dates', () => {
    const topics = generateDailyTopics(2);
    const now = new Date();
    
    topics.forEach(topic => {
      expect(topic.deadline).toBeInstanceOf(Date);
      expect(topic.deadline.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  it('should generate topics with non-empty strings', () => {
    const topics = generateDailyTopics(2);
    
    topics.forEach(topic => {
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.description.length).toBeGreaterThan(0);
      expect(topic.category.length).toBeGreaterThan(0);
    });
  });
});

describe('Predictor - generateTopic', () => {
  const validCategories = ['tech', 'crypto', 'ai', 'science'];

  validCategories.forEach(category => {
    it(`should generate valid topic for category: ${category}`, () => {
      const topic = generateTopic(category);
      
      expect(topic.category).toBe(category);
      expect(topic.title).toBeTruthy();
      expect(topic.description).toBeTruthy();
      expect(topic.deadline).toBeInstanceOf(Date);
    });
  });

  it('should generate topic with future deadline', () => {
    const topic = generateTopic('tech');
    const now = new Date();
    
    expect(topic.deadline.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should generate unique titles for multiple calls', () => {
    const topics = [
      generateTopic('tech'),
      generateTopic('tech'),
      generateTopic('tech'),
    ];
    
    const titles = topics.map(t => t.title);
    const uniqueTitles = new Set(titles);
    
    // Should have some variety (at least 2 different titles)
    expect(uniqueTitles.size).toBeGreaterThanOrEqual(2);
  });
});

describe('Predictor - formatTopicPost', () => {
  const mockTopic = {
    title: 'Will AI surpass human intelligence?',
    description: 'Recent advances in AI have sparked debate about when AGI might arrive',
    category: 'tech',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  it('should return object with title and content', () => {
    const post = formatTopicPost(mockTopic);
    
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('content');
  });

  it('should include topic title in post title', () => {
    const post = formatTopicPost(mockTopic);
    
    expect(post.title).toContain(mockTopic.title);
  });

  it('should include description in content', () => {
    const post = formatTopicPost(mockTopic);
    
    expect(post.content).toContain(mockTopic.description);
  });

  it('should include prediction format instructions', () => {
    const post = formatTopicPost(mockTopic);
    
    expect(post.content.toLowerCase()).toContain('predict');
  });

  it('should include deadline information', () => {
    const post = formatTopicPost(mockTopic);
    const content = post.title + post.content;
    
    // Should mention deadline, resolves, or time limit
    expect(content.toLowerCase()).toMatch(/deadline|until|by|resolves/);
  });

  it('should format content as markdown', () => {
    const post = formatTopicPost(mockTopic);
    
    // Check for markdown elements (headings, bullets, etc.)
    expect(post.content).toMatch(/[#*-]/);
  });
});
