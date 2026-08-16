// データを保存する関数
async function saveData(data) {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    
    if (isGuest) {
        // ゲストなら従来通りLocalStorageへ
        localStorage.setItem('gameData', JSON.stringify(data));
        console.log("ゲストデータ保存完了");
    } else {
        // ログイン中ならSupabaseへ
        const { data: { user } } = await sbClient.auth.getUser();
        if (!user) return;
        
        await sbClient.from('player_data').upsert({
            user_id: user.id,
            ...data
        });
        console.log("Supabaseデータ保存完了");
    }
}

// データを読み込む関数
async function loadData() {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    
    if (isGuest) {
        const data = localStorage.getItem('gameData');
        return data ? JSON.parse(data) : { coins: 100, packs: 0 }; // 初期値
    } else {
        const { data: { user } } = await sbClient.auth.getUser();
        if (!user) return null;
        
        const { data } = await sbClient.from('player_data').select('*').eq('user_id', user.id).single();
        return data;
    }
}