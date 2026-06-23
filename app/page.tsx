import { redirect } from 'next/navigation'
import { supabase } from './supabase'

export default async function Home() {
  redirect('/dashboard')
}