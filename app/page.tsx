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
  isbn?: string | null
  publisher?: string | null
  list_price?: number | null
  course_type?: string | null
  course_name?: string | null
  writing_type?: string | null
  writing_amount?: string | null
  physical_damage?: string | null
  stain_water_damage?: string | null
  accessories_status?: string | null
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
  const [courseType, setCourseType] = useState('')
  const [courseName, setCourseName] = useState('')
  const [writingType, setWritingType] = useState('')
  const [writingAmount, setWritingAmount] = useState('')
  const [physicalDamage, setPhysicalDamage] = useState('')
  const [stainWaterDamage, setStainWaterDamage] = useState('')
  const [accessoriesStatus, setAccessoriesStatus] = useState('')
  const [search, setSearch] = useState('')

  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')

  useEffect(() => {
    if (!image) {
      setImagePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(image)
    setImagePreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [image])

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
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
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
    const normalizedIsbn = isbn.replace(/[^0-9X]/gi, '').toUpperCase()
    if (!verified) {
  alert('学生認証が完了していません')
  return
  }
    if (!user) {
      alert('ログインしてください')
      return
    }

    if (!normalizedIsbn) {
      alert('ISBNを入力してください')
      return
    }

    if (!title.trim()) {
      alert('教科書名を入力してください')
      return
    }

    if (!price || Number(price) <= 0) {
      alert('販売価格を入力してください')
      return
    }

    if (!courseType) {
      alert('教養科目か専門科目を選択してください')
      return
    }

    if (courseType === '専門科目' && !faculty.trim()) {
      alert('専門科目は学部を入力してください')
      return
    }

    if (
      !writingType ||
      !writingAmount ||
      !physicalDamage ||
      !stainWaterDamage ||
      !accessoriesStatus
    ) {
      alert('本の状態をすべて選択してください')
      return
    }

        if (!listPrice || Number(listPrice) <= 0) {
      alert('定価を入力してください')
      return
    }

    if (Number(price) < Number(listPrice) * 0.5) {
      alert('販売価格は定価の50%以上で入力してください')
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


    const { data: sameIsbnListings, error: isbnCheckError } = await supabase
      .from('textbooks')
      .select('id, is_sold')
      .eq('isbn_normalized', normalizedIsbn)

    if (isbnCheckError) {
      console.error(isbnCheckError)
      alert('ISBNの重複確認に失敗しました。時間をおいて再度お試しください')
      return
    }

    if (sameIsbnListings?.some((book) => book.is_sold !== true)) {
      alert('このISBNの教科書はすでに出品されています')
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
        isbn: isbn.trim() || null,
        publisher: publisher.trim() || null,
        list_price: Number(listPrice),
        image_url: imageUrl,
        image_path: imagePath,
        faculty: courseType === '専門科目' ? faculty.trim() : '',
        course_type: courseType,
        course_name: courseName.trim() || null,
        writing_type: writingType,
        writing_amount: writingAmount,
        physical_damage: physicalDamage,
        stain_water_damage: stainWaterDamage,
        accessories_status: accessoriesStatus,
        is_sold: false,
        is_reserved: false,
        user_id: user.id,
      },
      ])

    if (error) {
      console.log(error)
      if (error.code === '23505') {
        alert('このISBNの教科書はすでに出品されています')
      } else if (error.code === '23514') {
        alert('ISBNを入力してください')
      } else {
        alert('投稿失敗')
      }
    } else {
      alert('投稿成功！')

      setIsbn('')
      setTitle('')
      setPrice('')
      setFaculty('')
      setPublisher('')
      setListPrice('')
      setCourseType('')
      setCourseName('')
      setWritingType('')
      setWritingAmount('')
      setPhysicalDamage('')
      setStainWaterDamage('')
      setAccessoriesStatus('')
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
      <div className="listing-form grid grid-cols-1 gap-4 max-w-4xl mb-10 md:grid-cols-2">

          <div className="flex gap-2 md:col-span-2">
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
              className="border p-2 w-full"
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
          className="border p-2 w-full"
        />

        <input
          type="number"
          placeholder="価格"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          type="number"
          placeholder="定価"
          value={listPrice ?? ""}
          onChange={(e) => setListPrice(e.target.value)}
          className="border p-2 w-full"
        />

        {priceLookupMessage && (
          <p className="text-red-600 md:col-span-2">
            {priceLookupMessage}。裏表紙の税込価格を定価欄に手入力してください。
          </p>
        )}

        <label className="flex flex-col gap-1">
          科目区分
          <select
            value={courseType}
            onChange={(event) => {
              const selectedType = event.target.value
              setCourseType(selectedType)
              if (selectedType === '教養科目') {
                setFaculty('')
              }
            }}
            className="border p-2 w-full"
          >
            <option value="">選択してください</option>
            <option value="教養科目">教養科目</option>
            <option value="専門科目">専門科目</option>
          </select>
        </label>

        <input
          type="text"
          placeholder="学部（専門科目の場合は必須）"
          value={faculty}
          onChange={(event) => setFaculty(event.target.value)}
          disabled={courseType === '教養科目'}
          className="border p-2 w-full"
        />

        <input
          type="text"
          placeholder="授業名（任意）"
          value={courseName}
          onChange={(event) => setCourseName(event.target.value)}
          className="border p-2 w-full"
        />

        <label className="flex flex-col gap-1">
          書き込みの種類
          <select
            value={writingType}
            onChange={(event) => {
              const selectedType = event.target.value
              setWritingType(selectedType)
              if (selectedType === 'なし') {
                setWritingAmount('なし')
              } else if (writingAmount === 'なし') {
                setWritingAmount('')
              }
            }}
            className="border p-2 w-full"
          >
            <option value="">選択してください</option>
            <option value="なし">なし</option>
            <option value="鉛筆のみ">鉛筆のみ</option>
            <option value="ペン・マーカーあり">ペン・マーカーあり</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          書き込みの量
          <select
            value={writingAmount}
            onChange={(event) => setWritingAmount(event.target.value)}
            disabled={writingType === 'なし'}
            className="border p-2 w-full"
          >
            <option value="">選択してください</option>
            {writingType === 'なし' ? (
              <option value="なし">なし</option>
            ) : (
              <>
                <option value="なし">なし</option>
                <option value="少ない">少ない</option>
                <option value="多い">多い</option>
              </>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          ページ・表紙の傷み
          <select
            value={physicalDamage}
            onChange={(event) => setPhysicalDamage(event.target.value)}
            className="border p-2 w-full"
          >
            <option value="">選択してください</option>
            <option value="なし">なし</option>
            <option value="軽い折れ・傷">軽い折れ・傷</option>
            <option value="破れ・欠けあり">破れ・欠けあり</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          シミ・水濡れ
          <select
            value={stainWaterDamage}
            onChange={(event) => setStainWaterDamage(event.target.value)}
            className="border p-2 w-full"
          >
            <option value="">選択してください</option>
            <option value="なし">なし</option>
            <option value="少しあり">少しあり</option>
            <option value="目立つ">目立つ</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          付属品
          <select
            value={accessoriesStatus}
            onChange={(event) => setAccessoriesStatus(event.target.value)}
            className="border p-2 w-full"
          >
            <option value="">選択してください</option>
            <option value="そろっている">そろっている</option>
            <option value="一部不足">一部不足</option>
            <option value="付属品なし・不明">付属品なし・不明</option>
          </select>
        </label>

        <div className="flex flex-col gap-3 md:col-span-2">
          <input
            id="textbook-image"
            type="file"
            accept="image/*"
            className="photo-file-input"
            onChange={(event) => {
              const selectedImage = event.target.files?.[0] ?? null
              event.target.value = ''
              setImage(selectedImage)
            }}
          />
          <label
            htmlFor="textbook-image"
            className="photo-picker-button"
          >
            {image ? '写真を変更' : '写真を選択'}
          </label>
          {image && imagePreview && (
            <div className="flex items-center gap-3">
              <img
                src={imagePreview}
                alt="選択した写真のプレビュー"
                className="photo-preview"
              />
              <span className="break-all text-sm text-gray-600">{image.name}</span>
            </div>
          )}
        </div>

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

            {book.course_type && <p>科目区分：{book.course_type}</p>}
            {book.faculty && <p>学部：{book.faculty}</p>}
            {book.course_name && <p>授業名：{book.course_name}</p>}
            {book.writing_type && <p>書き込み：{book.writing_type}（{book.writing_amount}）</p>}
            {book.physical_damage && <p>ページ・表紙の傷み：{book.physical_damage}</p>}
            {book.stain_water_damage && <p>シミ・水濡れ：{book.stain_water_damage}</p>}
            {book.accessories_status && <p>付属品：{book.accessories_status}</p>}
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



