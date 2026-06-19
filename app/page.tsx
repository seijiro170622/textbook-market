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
  const [search, setSearch] = useState('')

  const [image, setImage] = useState<File | null>(null)

  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [verified, setVerified] = useState(false)

  // ユーザー取得
const fetchUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  setUser(user)

  if (!user) {
    setVerified(false)
    return
  }
  await supabase
  .from('users')
  .upsert({
    id: user.id,
    email: user.email,
  })

  const { data } = await supabase
    .from('users')
    .select('verified')
    .eq('id', user.id)
    .single()

  console.log('EMAIL =', user.email)
  console.log('VERIFIED =', data?.verified)

  setVerified(data?.verified ?? false)
}

  // 投稿一覧取得
  const fetchTextbooks = async () => {

    let query = supabase
      .from('textbooks')
      .select('*')
      .order('created_at', { ascending: false })

    // 検索機能
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error } = await query

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
    setVerified(false)
  }

  // 投稿処理
  const handleSubmit = async () => {
    if (!verified) {
  alert('学生認証が完了していません')
  return
}
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
  const handleSold = async (id: string) => {
  const { error } = await supabase
      .from('textbooks')
      .update({ is_sold: true })
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('更新失敗')
    } else {
      alert('売却済みにしました')
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

  }, [search])

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
            <p>
              認証状態：
              {verified ? "承認済み" : "未承認"}
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

      {/* 検索 */}
      <input
        type="text"
        placeholder="教科書検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 mb-6 w-full max-w-sm"
      />

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
            <div className="flex gap-4 mt-2">
            <button
              onClick={() => handleSold(book.id)}
              style={{
                backgroundColor: 'green',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
            >
              売却済みにする
            </button>

            <button
              onClick={() =>
                handleDelete(book.id, book.image_path)
              }
              style={{
                backgroundColor: 'red',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
            >
              削除
            </button>
          </div>
                    )}

          </div>
        ))}

      </div>

    </main>
  )
}