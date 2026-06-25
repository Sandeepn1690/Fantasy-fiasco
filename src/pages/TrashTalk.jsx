import { useState } from 'react'
import { TRASH_TALK } from '../data/league.js'

export default function TrashTalk() {
  const [posts, setPosts] = useState(TRASH_TALK)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim() || !body.trim()) return
    setPosts([
      { id: Date.now(), name: name.trim(), team: '', time: 'just now', body: body.trim() },
      ...posts,
    ])
    setName('')
    setBody('')
  }

  return (
    <>
      <div className="page-head">
        <h2>Trash Talk</h2>
        <p>Post your hottest takes. Note: posts live in your browser session only — wire up a backend to make them permanent.</p>
      </div>

      <form className="post-form" onSubmit={submit}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <textarea
          rows={3}
          placeholder="Let 'em have it…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={280}
        />
        <button type="submit" className="btn btn-primary">Post</button>
      </form>

      {posts.map((p) => (
        <div className="post" key={p.id}>
          <div className="meta">
            <span className="name">{p.name}</span>
            {p.team && <span className="badge">{p.team}</span>}
            <span className="time">{p.time}</span>
          </div>
          <div className="body">{p.body}</div>
        </div>
      ))}
    </>
  )
}
