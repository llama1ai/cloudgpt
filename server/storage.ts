import { users, messages, chatSessions, type User, type InsertUser, type Message, type InsertMessage, type ChatSession, type InsertChatSession } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc } from 'drizzle-orm';

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getChatSessions(): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSessionTitle(id: number, title: string): Promise<void>;
  deleteChatSession(id: number): Promise<void>;
  getMessages(sessionId?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearMessages(sessionId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private chatSessions: Map<number, ChatSession>;
  private currentUserId: number;
  private currentMessageId: number;
  private currentSessionId: number;
  private currentActiveSessionId: number | null = null;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.chatSessions = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentSessionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentSessionId++;
    const session: ChatSession = { 
      ...insertSession, 
      id, 
      timestamp: new Date() 
    };
    this.chatSessions.set(id, session);
    this.currentActiveSessionId = id;
    return session;
  }

  async updateChatSessionTitle(id: number, title: string): Promise<void> {
    const session = this.chatSessions.get(id);
    if (session) {
      session.title = title;
      this.chatSessions.set(id, session);
    }
  }

  async deleteChatSession(id: number): Promise<void> {
    this.chatSessions.delete(id);
    // Also delete all messages in this session
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.sessionId === id)
      .map(([messageId, _]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
    
    if (this.currentActiveSessionId === id) {
      this.currentActiveSessionId = null;
    }
  }

  async getMessages(sessionId?: number): Promise<Message[]> {
    if (sessionId) {
      return Array.from(this.messages.values())
        .filter(message => message.sessionId === sessionId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    
    // For now, return all messages from session 1 (default session)
    return Array.from(this.messages.values())
      .filter(message => message.sessionId === 1)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      sessionId: insertMessage.sessionId || 1, // Default to session 1
      reasoning: insertMessage.reasoning || null,
      timestamp: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  async clearMessages(sessionId: number): Promise<void> {
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.sessionId === sessionId)
      .map(([messageId, _]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
  }

  // Helper methods for managing active session
  getCurrentActiveSessionId(): number | null {
    return this.currentActiveSessionId;
  }

  setCurrentActiveSessionId(sessionId: number | null): void {
    this.currentActiveSessionId = sessionId;
  }
}

// Hardcoded Supabase configuration
const SUPABASE_URL = 'https://aeyczbauibxruejzhsac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFleWN6YmF1aWJ4cnVlanpoc2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMzI1ODEsImV4cCI6MjA2NjkwODU4MX0.M5d8Z-uK74qHYqm8HGPL0UhpvYOBgsBTVXkyrwXzmTM';

// Database connection URL for Drizzle - using Supabase connection string
const DATABASE_URL = 'postgresql://postgres:ataner00@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1';

class SupabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle> | null = null;
  private currentActiveSessionId: number | null = null;
  private fallbackStorage: MemStorage;

  constructor() {
    this.fallbackStorage = new MemStorage();
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      const connectionString = postgres(DATABASE_URL);
      this.db = drizzle(connectionString);
      
      // Test the connection
      await this.db.select().from(users).limit(1);
      console.log('Supabase database connected successfully');
    } catch (error) {
      console.warn('Failed to connect to Supabase, using fallback storage:', error);
      this.db = null;
    }
  }

  private isConnected(): boolean {
    return this.db !== null;
  }

  async getUser(id: number): Promise<User | undefined> {
    if (!this.isConnected()) {
      return this.fallbackStorage.getUser(id);
    }
    const result = await this.db!.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.isConnected()) {
      return this.fallbackStorage.getUserByUsername(username);
    }
    const result = await this.db!.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.isConnected()) {
      return this.fallbackStorage.createUser(insertUser);
    }
    const result = await this.db!.insert(users).values([insertUser]).returning();
    return result[0];
  }

  async getChatSessions(): Promise<ChatSession[]> {
    if (!this.isConnected()) {
      return this.fallbackStorage.getChatSessions();
    }
    return await this.db!.select().from(chatSessions).orderBy(desc(chatSessions.timestamp));
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    if (!this.isConnected()) {
      const result = await this.fallbackStorage.createChatSession(insertSession);
      this.currentActiveSessionId = result.id;
      return result;
    }
    const result = await this.db!.insert(chatSessions).values([insertSession]).returning();
    this.currentActiveSessionId = result[0].id;
    return result[0];
  }

  async updateChatSessionTitle(id: number, title: string): Promise<void> {
    if (!this.isConnected()) {
      return this.fallbackStorage.updateChatSessionTitle(id, title);
    }
    await this.db!.update(chatSessions).set({ title }).where(eq(chatSessions.id, id));
  }

  async deleteChatSession(id: number): Promise<void> {
    if (!this.isConnected()) {
      await this.fallbackStorage.deleteChatSession(id);
      if (this.currentActiveSessionId === id) {
        this.currentActiveSessionId = null;
      }
      return;
    }
    await this.db!.delete(chatSessions).where(eq(chatSessions.id, id));
    await this.db!.delete(messages).where(eq(messages.sessionId, id));
    if (this.currentActiveSessionId === id) {
      this.currentActiveSessionId = null;
    }
  }

  async getMessages(sessionId?: number): Promise<Message[]> {
    if (!this.isConnected()) {
      return this.fallbackStorage.getMessages(sessionId);
    }
    
    if (sessionId) {
      return await this.db!.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.timestamp);
    }
    
    const activeSessionId = this.currentActiveSessionId;
    if (activeSessionId) {
      return await this.db!.select().from(messages).where(eq(messages.sessionId, activeSessionId)).orderBy(messages.timestamp);
    }
    
    return [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    if (!this.isConnected()) {
      return this.fallbackStorage.createMessage(insertMessage);
    }
    
    // Ensure sessionId is provided, use current active session if not specified
    const sessionId = insertMessage.sessionId || this.currentActiveSessionId;
    if (!sessionId) {
      throw new Error('No active session for message creation');
    }
    
    const messageData = {
      ...insertMessage,
      sessionId
    };
    
    const result = await this.db!.insert(messages).values([messageData]).returning();
    return result[0];
  }

  async clearMessages(sessionId: number): Promise<void> {
    if (!this.isConnected()) {
      return this.fallbackStorage.clearMessages(sessionId);
    }
    await this.db!.delete(messages).where(eq(messages.sessionId, sessionId));
  }

  getCurrentActiveSessionId(): number | null {
    return this.currentActiveSessionId;
  }

  setCurrentActiveSessionId(sessionId: number | null): void {
    this.currentActiveSessionId = sessionId;
  }
}

// Create storage instance with fallback to MemStorage if Supabase fails
let storage: IStorage;

try {
  storage = new SupabaseStorage();
  console.log('Using Supabase storage');
} catch (error) {
  console.warn('Failed to connect to Supabase, falling back to memory storage:', error);
  storage = new MemStorage();
}

export { storage };
