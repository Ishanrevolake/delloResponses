const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kgifjfstguqmsofjwawx.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jrfPD2_qOqcfXWNSJhVSqA_oiGaqLTD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addWebsite() {
  const { data, error } = await supabase
    .from('websites')
    .insert([
      { name: 'GraftGym', domain: 'https://graftgym.dellodigital.com/' }
    ])
    .select();

  if (error) {
    if (error.code === '23505') { // unique constraint violation
         console.log('Website already exists in the database.');
         const { data: existingData } = await supabase.from('websites').select('*').eq('domain', 'https://graftgym.dellodigital.com/');
         if (existingData && existingData.length > 0) {
             console.log('Existing Website ID:', existingData[0].id);
         }
    } else {
         console.error('Error adding website:', error);
    }
  } else {
    console.log('Successfully added website!');
    console.log('Website ID:', data[0].id);
  }
}

addWebsite();
