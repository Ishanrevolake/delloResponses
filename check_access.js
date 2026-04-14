const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccess() {
    const userId = '3e9182e2-a191-442f-989f-a00bf7cf2da7';
    const siteId = 'edb39be2-2f51-4853-9408-746e878457d9';

    // 1. Check user role
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

    // 2. Check website
    const { data: siteData, error: siteError } = await supabase
        .from('websites')
        .select('id, name, owner_id')
        .eq('id', siteId)
        .single();
    
    let hasAccess = false;
    let reason = '';
    
    if (roleData && roleData.role === 'admin') {
        hasAccess = true;
        reason = 'Admin';
    } else if (siteData && siteData.owner_id === userId) {
        hasAccess = true;
        reason = 'Owner of site';
    } else {
        hasAccess = false;
        reason = 'Not admin and not owner. Current owner is ' + (siteData ? siteData.owner_id : 'null');
    }
    
    fs.writeFileSync('out.json', JSON.stringify({
       roleData, roleError, siteData, siteError, hasAccess, reason
    }, null, 2));
}

checkAccess();
