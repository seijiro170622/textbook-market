"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"

type AppUser = {
    id: string
    email: string
    verified: boolean
    }

    export default function AdminPage() {
    const [user, setUser] = useState<User | null>(null)
    const [users, setUsers] = useState<AppUser[]>([])

    const isAdmin = user?.email === "seijiro170622@gmail.com"

    // ログインユーザー取得
    useEffect(() => {
        const init = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        setUser(user)
        }

        init()
    }, [])

    // 未承認ユーザー取得
    const fetchUsers = async () => {
        const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("verified", false)

        if (error) {
        console.log(error)
        return
        }

        setUsers(data || [])
    }

    useEffect(() => {
        if (isAdmin) {
        fetchUsers()
        }
    }, [isAdmin])

    // 承認
    const approveUser = async (id: string) => {
        if (!isAdmin) return

        const { error } = await supabase
        .from("users")
        .update({ verified: true })
        .eq("id", id)

        if (error) {
        console.log(error)
        alert("承認失敗")
        return
        }

        alert("承認しました")
        fetchUsers()
    }

    if (!user) {
        return (
        <div className="p-10">
            ログイン中...
        </div>
        )
    }

    if (!isAdmin) {
        return (
        <div className="p-10 text-red-500 font-bold">
            権限がありません
        </div>
        )
    }

    return (
        <main className="p-10 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
            管理者ページ
        </h1>

        {users.length === 0 ? (
            <p>未承認ユーザーはいません</p>
        ) : (
            <div className="space-y-4">
            {users.map((u) => (
                <div
                key={u.id}
                className="border p-4 rounded flex justify-between items-center"
                >
                <p>{u.email}</p>

                <button
                    onClick={() => approveUser(u.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded"
                >
                    承認
                </button>
                </div>
            ))}
            </div>
        )}
        </main>
    )
    }