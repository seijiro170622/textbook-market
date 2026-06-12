import { supabase } from "@/lib/supabase"

export const handleSubmit = async (user: any, verified: boolean) => {
    if (!user) return alert("ログインしてください")
    if (!verified) return alert("未承認です")

    // 投稿処理
    }