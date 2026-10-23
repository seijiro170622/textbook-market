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
  is_reserved: boolean
  reserved_by: string | null
  user_id: string
}

export default function Home() {
  const [isbn, setIsbn] = useState("");
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [faculty, setFaculty] = useState('')
  const [search, setSearch] = useState('')

  const [image, setImage] = useState<File | null>(null)

  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [verified, setVerified] = useState(false)
  const [publisher, setPublisher] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [agreedToPricingTerms, setAgreedToPricingTerms] = useState(false)
  const [showPricingTerms, setShowPricingTerms] = useState(false)
  const [priceLookupMessage, setPriceLookupMessage] = useState('')

  const sellingPrice = Number(price) || 0
  const platformFee = Math.floor(sellingPrice * 0.1)
  const sellerReceives = sellingPrice - platformFee


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

// 投稿一覧取得
  const fetchBookInfo = async () => {
    if (!isbn) {
      alert('ISBNを入力してください')
      return
    }

    setPriceLookupMessage('')
    setListPrice('')

    try {
      const res = await fetch(
        `https://api.openbd.jp/v1/get?isbn=${isbn}`
      )
      const data: any[] = await res.json()

      if (!data[0]?.summary) {
        setPriceLookupMessage('定価を取得できませんでした')
        alert('教科書が見つかりませんでした')
        return
      }

      const record = data[0]
      const book = record.summary

      setTitle(book.title || '')
      setPublisher(book.publisher || '')

      const prices = record.onix?.ProductSupply?.SupplyDetail?.Price
      const recommendedPrice = Array.isArray(prices)
        ? prices.find((item: any) => String(item.PriceType) === '02')
        : undefined

      const fetchedListPrice = recommendedPrice?.PriceAmount

      if (fetchedListPrice) {
        setListPrice(String(fetchedListPrice))
      } else {
        setPriceLookupMessage('定価を取得できませんでした')
      }
    } catch (error) {
      console.error(error)
      setPriceLookupMessage('定価を取得できませんでした')
      alert('取得に失敗しました')
    }
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

    if (
      listPrice &&
      Number(price) > Number(listPrice) - 100
    ) {
      alert('販売価格は定価より100円以上安くしてください')
      return
    }

    if (!agreedToPricingTerms) {
      alert('販売価格と手数料のルールに同意してください')
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
        is_reserved: false,
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
      setAgreedToPricingTerms(false)
      setShowPricingTerms(false)

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

// 売却済み解除
  const handleUnsold = async (id: string) => {
  const { error } = await supabase
      .from('textbooks')
      .update({
        is_sold: false,
        is_reserved: false,
        reserved_by: null,
      })
      .eq('id', id)

    if (error) {
      alert('解除失敗')
    } else {
      alert('売却済みを解除しました')
      fetchTextbooks()
    }
  }

// 売却済みにする
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

// 予約する
  const handleReserve = async (id: string) => {
  if (!user) {
    alert('ログインしてください')
    return
  }

  console.log('reserve id =', id)

  const { data, error } = await supabase
    .from('textbooks')
    .update({
      is_reserved: true,
      reserved_by: user.id,
    })
    .eq('id', id)
    .select()

  console.log('data=', data)
  console.log('error=', error)

    if (error) {
      alert('予約失敗')
      return
    }

    alert('予約しました')
    fetchTextbooks()
  }
  const handleCancelReserve = async (id: string) => {
  const { error } = await supabase
    .from('textbooks')
    .update({
      is_reserved: false,
      reserved_by: null,
    })
    .eq('id', id)

    if (error) {
      console.log(error)
      alert('予約キャンセル失敗')
    } else {
      alert('予約をキャンセルしました')
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

// 画面表示
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
        placeholder="🔍教科書検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 mb-6 w-full max-w-sm"
      />

      {/* 投稿フォーム */}
      <div className="flex flex-col gap-4 max-w-sm mb-10">

          <div className="flex gap-2">
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="ISBNを入力"
              className="border p-2 flex-1"
            />

            <input
              type="text"
              placeholder="出版社"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              className="border p-2"
            />

          <button
            type="button"
              onClick={fetchBookInfo}
              className="bg-blue-500 text-white px-4 rounded"
          >
            取得
          </button>
          </div>

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
          type="number"
          placeholder="定価"
          value={listPrice ?? ""}
          onChange={(e) => setListPrice(e.target.value)}
          className="border p-2"
        />

        {priceLookupMessage && (
          <p className="text-red-600">
            {priceLookupMessage}。裏表紙の税込価格を定価欄に手入力してください。
          </p>
        )}

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
          type="button"
          onClick={() => {
            setAgreedToPricingTerms(false)
            setShowPricingTerms(true)
          }}
          className="bg-black text-white p-2 rounded"
        >
          投稿
        </button>

      </div>

      {showPricingTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded bg-white p-6 shadow-xl">
            <h2 className="mb-3 text-xl font-bold">
              販売価格と手数料について
            </h2>

            <p className="mb-3">
              販売価格は、定価の50%以上かつ定価より100円以上安い金額で設定してください。
              商品が売れた場合、販売価格の10%を販売手数料としていただきます。
            </p>

            <p>販売価格：{sellingPrice.toLocaleString()}円</p>
            <p>手数料：{platformFee.toLocaleString()}円</p>
            <p>出品者の受取予定額：{sellerReceives.toLocaleString()}円</p>

            <p className="my-3">
              例：定価3,000円、販売価格2,900円の場合、手数料290円、受取予定額2,610円
            </p>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={agreedToPricingTerms}
                onChange={(event) =>
                  setAgreedToPricingTerms(event.target.checked)
                }
              />
              上記の販売価格・手数料ルールに同意して出品します。
            </label>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPricingTerms(false)}
                className="rounded bg-gray-500 px-4 py-2 text-white"
              >
                戻る
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                className="rounded bg-black px-4 py-2 text-white"
              >
                同意して出品
              </button>
            </div>
          </div>
        </div>
      )}
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
            {!book.is_reserved &&
            !book.is_sold &&
            user?.id !== book.user_id && (
              <button
                onClick={() => handleReserve(book.id)}
                style={{
                  backgroundColor: 'orange',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginTop: '8px'
                }}
              >
                予約する
              </button>
            )}

            {book.is_reserved && !book.is_sold && (
              <p style={{ color: 'orange' }}>
                🟠 予約済み
              </p>
            )}
            
            {book.reserved_by === user?.id &&
            !book.is_sold && (
              <button
                onClick={() => handleCancelReserve(book.id)}
                style={{
                  backgroundColor: 'gray',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginTop: '8px'
                }}
              >
                予約キャンセル
              </button>
            )}

            {book.is_sold && (
              <button
                onClick={() => handleUnsold(book.id)}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px'
                }}
              >
                売却済みを解除
              </button>
            )}
            
            {user?.id === book.user_id &&
            book.reserved_by && (
              <p style={{ color: 'orange' }}>
                🟠予約者あり
              </p>
            )}

            {/* 自分の投稿だけ操作可能 */}
                        {/* 投稿者だけ操作可能 */}
            {user?.id === book.user_id && (
              <div className="flex gap-4 mt-2">

                {book.is_reserved && !book.is_sold && (
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
                )}

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