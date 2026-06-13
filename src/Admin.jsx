import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase.js'
import './App.css'

const initialForm = {
  subject: '',
  maxMarks: '',
  questionText: '',
  markScheme: '',
}

function Admin() {
  const [form, setForm] = useState(initialForm)
  const [questions, setQuestions] = useState([])
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    setLoadingQuestions(true)

    try {
      const questionsQuery = query(
        collection(db, 'Questions'),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(questionsQuery)
      const loadedQuestions = snapshot.docs.map((questionDoc) => ({
        id: questionDoc.id,
        ...questionDoc.data(),
      }))

      setQuestions(loadedQuestions)
    } catch (error) {
      console.error('Error loading questions:', error)
      setStatus(`Could not load questions: ${error.message}`)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleEditSelect = (question) => {
    setSelectedQuestionId(question.id)
    setForm({
      subject: question.subject || '',
      maxMarks: String(question.maxMarks || ''),
      questionText: question.questionText || '',
      markScheme: question.markScheme || '',
    })
    setStatus(`Editing question: ${question.subject || 'Untitled question'}`)
  }

  const handleReset = () => {
    setSelectedQuestionId('')
    setForm(initialForm)
    setStatus('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const subject = form.subject.trim()
    const maxMarks = Number(form.maxMarks)
    const questionText = form.questionText.trim()
    const markScheme = form.markScheme.trim()

    if (!subject || !questionText || !markScheme || !Number.isFinite(maxMarks) || maxMarks <= 0 || saving) {
      setStatus('Please complete all fields before saving.')
      return
    }

    setSaving(true)
    setStatus('')

    try {
      if (selectedQuestionId) {
        await updateDoc(doc(db, 'Questions', selectedQuestionId), {
          subject,
          maxMarks,
          questionText,
          markScheme,
          updatedAt: serverTimestamp(),
        })
        setStatus('Question updated in Firestore.')
      } else {
        await addDoc(collection(db, 'Questions'), {
          subject,
          maxMarks,
          questionText,
          markScheme,
          createdAt: serverTimestamp(),
        })
        setStatus('Question saved to Firestore.')
      }

      await loadQuestions()
      setSelectedQuestionId('')
      setForm(initialForm)
    } catch (error) {
      console.error('Error saving question:', error)
      setStatus(`Could not save question: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>{selectedQuestionId ? 'Edit Question' : 'Add Question'}</h1>
            <p className="panel-copy">
              Create or update questions in the Firestore <strong>Questions</strong> collection.
            </p>
          </div>
          <a className="secondary-link" href="/">
            Back to marker
          </a>
        </div>

        <section className="question-list-card">
          <div className="question-list-header">
            <h2>Existing questions</h2>
            {selectedQuestionId ? (
              <button className="secondary-button" type="button" onClick={handleReset}>
                Add new question
              </button>
            ) : null}
          </div>

          {loadingQuestions ? <p>Loading questions...</p> : null}

          {!loadingQuestions && !questions.length ? (
            <p>No saved questions yet.</p>
          ) : null}

          {!!questions.length && (
            <div className="question-list">
              {questions.map((question) => (
                <button
                  key={question.id}
                  className={`question-list-item${selectedQuestionId === question.id ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => handleEditSelect(question)}
                >
                  <span className="question-list-subject">{question.subject || 'No subject'}</span>
                  <span className="question-list-text">{question.questionText || 'Untitled question'}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Subject</span>
            <input
              name="subject"
              type="text"
              value={form.subject}
              onChange={handleChange}
              placeholder="e.g. Biology"
            />
          </label>

          <label className="field">
            <span>Question</span>
            <textarea
              name="questionText"
              value={form.questionText}
              onChange={handleChange}
              placeholder="Enter the full question..."
              rows={6}
            />
          </label>

          <label className="field">
            <span>Maximum marks</span>
            <input
              name="maxMarks"
              type="number"
              min="1"
              step="1"
              value={form.maxMarks}
              onChange={handleChange}
              placeholder="e.g. 6"
            />
          </label>

          <label className="field">
            <span>Mark scheme</span>
            <textarea
              name="markScheme"
              value={form.markScheme}
              onChange={handleChange}
              placeholder="Enter the marking guidance..."
              rows={8}
            />
          </label>

          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : selectedQuestionId ? 'Update question' : 'Save question'}
          </button>
        </form>

        {status && <p className="status-message">{status}</p>}
      </section>
    </main>
  )
}

export default Admin
