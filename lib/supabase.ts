import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://wndvqnviyieenbkraoqk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZHZxbnZpeWllZW5ia3Jhb3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTg4NDIsImV4cCI6MjA5MDQ3NDg0Mn0.gm6wGdF3okmKEdJoDzazrgY1AT7RLDLApQluFEtHuMQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
