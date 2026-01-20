
import { supabase } from '../lib/supabase';

async function setupStorage() {
    console.log("Checking 'avatars' bucket...");

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error("Error listing buckets:", listError);
        return;
    }

    const avatarsBucket = buckets.find(b => b.name === 'avatars');

    if (avatarsBucket) {
        console.log("'avatars' bucket already exists.");
        // Should update to public if not? The API doesn't easily allow updating 'public' status via JS client 
        // without recreating or using specific update method if available, but usually it's set on creation.
        // We'll assume if it exists it handles what we need, or we can try to update it.
        const { data, error } = await supabase.storage.updateBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
            fileSizeLimit: 5242880 // 5MB
        });
        if (error) console.error("Error updating bucket:", error);
        else console.log("Bucket updated to public.");
    } else {
        console.log("Creating 'avatars' bucket...");
        const { data, error } = await supabase.storage.createBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
            fileSizeLimit: 5242880 // 5MB
        });

        if (error) {
            console.error("Error creating bucket:", error);
        } else {
            console.log("Successfully created 'avatars' bucket!");
        }
    }
}

setupStorage();
