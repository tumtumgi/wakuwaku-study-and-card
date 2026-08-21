// js/auth_controller.js
const AuthController = {
    // ログイン処理
    login: async (email, password) => {
        const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.removeItem('isGuest'); // ゲストモードを解除
        return data;
    },

    // 新規登録処理
    signUp: async (email, password) => {
        const { data, error } = await sbClient.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    },

    // ゲストとして遊ぶ
    playAsGuest: () => {
        localStorage.setItem('isGuest', 'true');
        window.location.href = 'menu.html';
    },

    // ログアウト処理
    logout: async () => {
        await sbClient.auth.signOut();
        localStorage.removeItem('isGuest');
        window.location.href = 'index.html';
    },

    // 今のステータスを確認（ログイン中か、ゲストか）
    checkAccess: async (requireLogin = false) => {
        const { data: { user } } = await sbClient.auth.getUser();
        const isGuest = localStorage.getItem('isGuest') === 'true';

        if (requireLogin && !user) {
            alert("この機能にはログインが必要です。");
            window.location.href = 'index.html';
            return false;
        }

        if (!user && !isGuest) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};