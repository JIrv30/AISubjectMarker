import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { generateFeedback } from './gemini.js'
import Admin from './Admin.jsx'
import { db } from './firebase.js'
import './App.css'

function formatFeedback(feedback) {
  const lines = feedback
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const scoreLine = lines.find((line) => /^score:/i.test(line)) || ''
  const detailLines = lines.filter((line) => line !== scoreLine)

  return { scoreLine, detailLines }
}

function App() {
  if (window.location.pathname === '/admin') {
    return <Admin />
  }

  const [questions, setQuestions] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionError, setQuestionError] = useState('')
  const [questionLoading, setQuestionLoading] = useState(true)
  const [answer, setAnswer] = useState('')
  const [submittedAnswer, setSubmittedAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const formattedFeedback = feedback ? formatFeedback(feedback) : null
  const topics = [...new Set(questions.map((question) => question.subject).filter(Boolean))]
  const questionsInTopic = selectedTopic
    ? questions.filter((question) => question.subject === selectedTopic)
    : questions
  const question = questionsInTopic[currentQuestionIndex] || null

  useEffect(() => {
    async function loadQuestions() {
      setQuestionLoading(true)
      setQuestionError('')

      try {
        const questionsQuery = query(
          collection(db, 'Questions'),
          orderBy('createdAt', 'desc'),
        )
        const snapshot = await getDocs(questionsQuery)

        if (snapshot.empty) {
          setQuestions([])
          setQuestionError('No questions were found in Firestore.')
          return
        }

        const loadedQuestions = snapshot.docs.map((questionDoc) => ({
          id: questionDoc.id,
          ...questionDoc.data(),
        }))

        setQuestions(loadedQuestions)
        const firstTopic = loadedQuestions[0]?.subject || ''
        setSelectedTopic(firstTopic)
        setCurrentQuestionIndex(0)
      } catch (error) {
        console.error('Error loading question:', error)
        setQuestions([])
        setQuestionError(`Could not load question: ${error.message}`)
      } finally {
        setQuestionLoading(false)
      }
    }

    loadQuestions()
  }, [])

  useEffect(() => {
    setAnswer('')
    setSubmittedAnswer('')
    setFeedback('')
  }, [selectedTopic, currentQuestionIndex])

  const handleTopicChange = (e) => {
    setSelectedTopic(e.target.value)
    setCurrentQuestionIndex(0)
  }

  const handleQuestionChange = (direction) => {
    setCurrentQuestionIndex((currentIndex) => currentIndex + direction)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      if (!loading && answer.trim()) {
        e.currentTarget.form?.requestSubmit()
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextAnswer = answer.trim()

    if (!question || !nextAnswer || loading) {
      return
    }

    setSubmittedAnswer(nextAnswer)
    setFeedback('')
    setLoading(true)

    try {
      const result = await generateFeedback({
        subject: question.subject,
        maxMarks: question.maxMarks,
        questionText: question.questionText,
        markScheme: question.markScheme,
        studentAnswer: nextAnswer,
      })
      setFeedback(result)
    } catch (error) {
      setFeedback('Error: ' + error.message)
    } finally {
      setAnswer('')
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Student view</p>
            <h1>AI Subject Marker</h1>
            <p className="panel-copy">
              Read the question, submit your answer, and receive feedback generated from the mark scheme.
            </p>
          </div>
          <a className="secondary-link" href="/admin">
            Open admin
          </a>
        </div>

        <section className="question-card">
          <div className="question-header">
            <p className="question-label">Current question</p>
            {!questionLoading && question?.subject && (
              <span className="question-subject-pill">{question.subject}</span>
            )}
          </div>
          {questionLoading && <p>Loading question...</p>}
          {!questionLoading && questionError && <p>{questionError}</p>}
          {!questionLoading && question && (
            <>
              <div className="question-toolbar">
                <label className="field topic-field">
                  <span>Topic</span>
                  <select value={selectedTopic} onChange={handleTopicChange}>
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="question-nav">
                  <p className="question-position">
                    Question {currentQuestionIndex + 1} of {questionsInTopic.length}
                  </p>
                  <div className="question-nav-buttons">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleQuestionChange(-1)}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleQuestionChange(1)}
                      disabled={currentQuestionIndex >= questionsInTopic.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <h2 className="question-title">Answer the following</h2>
              {question.maxMarks ? (
                <p className="question-marks">This question is worth {question.maxMarks} mark{question.maxMarks === 1 ? '' : 's'}.</p>
              ) : null}
              <p className="question-text">{question.questionText}</p>
            </>
          )}
        </section>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Your answer</span>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your answer here..."
              rows={8}
              disabled={!question || questionLoading}
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Marking...' : 'Get feedback'}
          </button>
        </form>

        {submittedAnswer && (
          <section className="output-card">
            <h2>Your answer</h2>
            <p>{submittedAnswer}</p>
          </section>
        )}

        {feedback && (
          <section className="feedback-card">
            <div className="feedback-header">
              <div>
                <p className="question-label">Marked result</p>
                <h2>Feedback</h2>
              </div>
              {formattedFeedback?.scoreLine ? (
                <div className="score-pill">{formattedFeedback.scoreLine.replace(/^score:\s*/i, '')}</div>
              ) : null}
            </div>

            <div className="feedback-body">
              {formattedFeedback?.detailLines.map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className={/^\d+\./.test(line) ? 'feedback-section-title' : 'feedback-paragraph'}
                >
                  {line}
                </p>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
