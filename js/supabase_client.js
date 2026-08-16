// js/supabase_client.js
const SUPABASE_URL = 'https://nvyokxyumsczfnlcylgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52eW9reHl1bXNjemZubGN5bGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MzcxMzEsImV4cCI6MjEwMTIxMzEzMX0.QV_LXcx8cBgfJbaYmU7QidK2zemdF7mCNoiqEEcm-w4';

const { createClient } = supabase;
const sbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);