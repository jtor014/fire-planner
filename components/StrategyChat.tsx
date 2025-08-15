import React, { useState } from 'react'

interface ChatMessage {
  id: string
  question: string
  answer: string
  timestamp: Date
  scenarioId?: string
}

interface StrategyChatProps {
  currentScenarioId?: string
}

export default function StrategyChat({ currentScenarioId }: StrategyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentQuestion.trim()) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion,
          scenarioId: currentScenarioId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          question: currentQuestion,
          answer: data.answer,
          timestamp: new Date(),
          scenarioId: currentScenarioId,
        }

        setMessages(prev => [...prev, newMessage])
        setCurrentQuestion('')
      } else {
        console.error('AI query failed:', data.error)
      }
    } catch (error) {
      console.error('Error submitting question:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "Should I pay off my mortgage early or invest in the share market?",
    "What's the optimal superannuation contribution strategy for my situation?",
    "How does negative gearing affect my FIRE timeline?",
    "Should I sell my investment property to accelerate my FIRE journey?",
    "What are the tax implications of my current scenario?",
    "How can I optimize my asset allocation for early retirement?",
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Financial Strategy Assistant</h2>
          <p className="text-gray-600 mt-2">
            Ask questions about your FIRE strategy and get personalized advice based on your current financial situation.
          </p>
        </div>

        <div className="p-6">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Get Started</h3>
              <p className="text-gray-600 mb-6">
                Ask a question or choose from these popular topics:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(question)}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <span className="text-sm text-blue-600">{question}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 mb-6">
              {messages.map((message) => (
                <div key={message.id} className="border-b pb-6">
                  <div className="mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">Q</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{message.question}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {message.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-medium">A</span>
                    </div>
                    <div className="flex-1 prose prose-sm max-w-none">
                      <div className="text-gray-700 whitespace-pre-wrap">{message.answer}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                Ask a question about your financial strategy:
              </label>
              <textarea
                id="question"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Should I prioritize paying off my mortgage or investing in ETFs?"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {currentScenarioId ? (
                  <span>✓ Scenario context will be included</span>
                ) : (
                  <span>💡 Select a scenario for more personalized advice</span>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !currentQuestion.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Thinking...' : 'Get Advice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}