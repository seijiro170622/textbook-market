'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

type Textbook = {
  id: string
  title: string
  price: number
  image_url: string
  image_path: string
  faculty: string
  is_sold: boolean
  user_id: string
}

export default function Home() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [faculty, setFaculty] = useState('')
  const [image, setImage] = useState<File | null>(null)

  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [user, setUser] = useState<User | null>(null)

  // ユーザー取得
  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)
  }

  // 投稿一覧取得
  const fetchTextbooks = async () => {
    const { data, error } = await supabase
      .from('textbooks')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setTextbooks(data)
    }

    if (error) {
      console.log(error)
    }
  }

  // Googleログイン
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
  }

  // ログアウト
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // 投稿処理
  const handleSubmit = async () => {
    if (!user) {
      alert('ログインしてください')
      return
    }

    let imageUrl = ''
    let imagePath = ''

    // 画像アップロード
    if (image) {
      const fileName = `${Date.now()}-${image.name}`

      const { error: uploadError } = await supabase.storage
        .from('textbook-images')
        .upload(fileName, image)

      if (uploadError) {
        console.log(uploadError)
        alert('画像アップロード失敗')
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('textbook-images')
        .getPublicUrl(fileName)

      imageUrl = publicUrlData.publicUrl
      imagePath = fileName
    }

    // DB保存
    const { error } = await supabase
      .from('textbooks')
      .insert([
        {
          title,
          price: Number(price),
          image_url: imageUrl,
          image_path: imagePath,
          faculty,
          is_sold: false,
          user_id: user.id,
        },
      ])

    if (error) {
      console.log(error)
      alert('投稿失敗')
    } else {
      alert('投稿成功！')

      setTitle('')
      setPrice('')
      setFaculty('')
      setImage(null)

      fetchTextbooks()
    }
  }

  // 投稿削除
  const handleDelete = async (
    id: string,
    imagePath: string
  ) => {

    // Storage画像削除
    if (imagePath) {
      await supabase.storage
        .from('textbook-images')
        .remove([imagePath])
    }

    // DB削除
    const { error } = await supabase
      .from('textbooks')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('削除失敗')
    } else {
      alert('削除成功')
      fetchTextbooks()
    }
  }

  // 初回取得
  useEffect(() => {
    fetchTextbooks()
    fetchUser()

    supabase.auth.onAuthStateChange(() => {
      fetchUser()
    })
  }, [])

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-6">
        教科書マーケット
      </h1>

      {/* ログイン状態 */}
      <div className="mb-6">

        {user ? (
          <div className="flex items-center gap-4">

            <p>
              ログイン中:
              {' '}
              {user.email}
            </p>

            <button
              onClick={handleLogout}
              className="bg-gray-500 text-white px-3 py-1 rounded"
            >
              ログアウト
            </button>

          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Googleログイン
          </button>
        )}

      </div>

      {/* 投稿フォーム */}
      <div className="flex flex-col gap-4 max-w-sm mb-10">

        <input
          type="text"
          placeholder="教科書名"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2"
        />

        <input
          type="number"
          placeholder="価格"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2"
        />

        <input
          type="text"
          placeholder="学部"
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          className="border p-2"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setImage(e.target.files[0])
            }
          }}
        />

        <button
          onClick={handleSubmit}
          className="bg-black text-white p-2 rounded"
        >
          投稿
        </button>

      </div>

      {/* 投稿一覧 */}
      <div className="flex flex-col gap-4">

        {textbooks.map((book) => (
          <div
            key={book.id}
            className="border p-4 rounded"
          >

            {book.image_url && (
              <img
                src={book.image_url}
                alt={book.title}
                className="w-40 mb-2 rounded"
              />
            )}

            <h2 className="text-xl font-bold">
              {book.title}
            </h2>

            <p>{book.price}円</p>

            <p>{book.faculty}</p>

            {book.is_sold && (
              <p className="text-red-500">
                売却済み
              </p>
            )}

            {/* 自分の投稿だけ削除可能 */}
            {user?.id === book.user_id && (
              <button
                onClick={() =>
                  handleDelete(book.id, book.image_path)
                }
                className="bg-red-500 text-white px-3 py-1 rounded mt-2"
              >
                削除
              </button>
            )}

          </div>
        ))}

      </div>
    </main>
  )
}