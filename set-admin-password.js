const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) { console.error('Error fetching users:', error); return; }

    const user = users.find(u => u.email === 'anchen-ser@yandex.ru');
    if (user) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password: 'Cthueyz7753191'
        });
        if (updateError) { console.error('Error updating password:', updateError); }
        else { console.log('Password successfully updated for existing admin user!'); }
    } else {
        const { data, error: createError } = await supabase.auth.admin.createUser({
            email: 'anchen-ser@yandex.ru',
            password: 'Cthueyz7753191',
            email_confirm: true
        });
        if (createError) { console.error('Error creating user:', createError); }
        else { console.log('Admin user successfully created with password!'); }
    }
}

run();
