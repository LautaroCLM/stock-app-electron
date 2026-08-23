// test-direct-supabase.js
'use strict';

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testDirect() {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    console.log(url);
    console.log(key ? key.slice(0, 20) : 'undefined');

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .limit(1);

    console.dir(data, { depth: null });
    console.dir(error, { depth: null });
  } catch (err) {
    console.dir(err, { depth: null });
  }
}

testDirect();
