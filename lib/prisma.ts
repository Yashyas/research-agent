import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Define the global type
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create a factory function to handle the initialization
const prismaClientSingleton = () => {
  // 1. Create the pool
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  
  // 2. Create the adapter
  const adapter = new PrismaPg(pool);
  
  // 3. Return the fully initialized client
  return new PrismaClient({ adapter });
};

// Use the existing global instance, or initialize a new one if it doesn't exist
export const prisma = 
  globalForPrisma.prisma ?? prismaClientSingleton();

// Save the instance to the global object in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}