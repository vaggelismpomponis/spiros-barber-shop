import { createClient } from '../utils/supabase/server';
import { cookies } from 'next/headers';

export async function isAdmin(): Promise<boolean> {
    try {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return false;

        const { data: admin } = await supabase
            .from('admins')
            .select('id')
            .eq('email', session.user.email)
            .single();

        return !!admin;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
} 