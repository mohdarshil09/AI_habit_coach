import React, { useState, useEffect, useRef } from 'react'
import { Send, Target, CheckCircle, Circle, Sparkles, Plus, Edit3, Trash2, Calendar, Flag, BarChart3, Filter } from 'lucide-react'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [goals, setGoals] = useState([])
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [newGoal, setNewGoal] = useState('')
  const [goalType, setGoalType] = useState('daily')
  const [goalCategory, setGoalCategory] = useState('general')
  const [goalPriority, setGoalPriority] = useState('medium')
  const [goalTargetDate, setGoalTargetDate] = useState('')
  const [goalDescription, setGoalDescription] = useState('')
  const [editingGoal, setEditingGoal] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showStats, setShowStats] = useState(false)
  const [goalStats, setGoalStats] = useState({})
  const [motivationQuote, setMotivationQuote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load saved data from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('habit-coach-messages')
    const savedGoals = localStorage.getItem('habit-coach-goals')
    
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages))
    }
    
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals))
    }
    
    // Load initial motivation quote and stats
    fetchMotivation()
    fetchGoalStats()
  }, [])

  // Filter goals by category
  const filteredGoals = goals.filter(goal => 
    selectedCategory === 'all' || goal.category === selectedCategory
  )

  // Get unique categories
  const categories = ['all', ...new Set(goals.map(goal => goal.category).filter(Boolean))]

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem('habit-coach-messages', JSON.stringify(messages))
  }, [messages])

  // Save goals to localStorage
  useEffect(() => {
    localStorage.setItem('habit-coach-goals', JSON.stringify(goals))
  }, [goals])

  const fetchMotivation = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8001/motivation')
      const data = await response.json()
      if (data.success) {
        setMotivationQuote(data.quote)
      }
    } catch (error) {
      setMotivationQuote('Every small step counts! 💪')
    }
  }

  const fetchGoalStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8001/goals/stats')
      const data = await response.json()
      if (data.success) {
        setGoalStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch goal stats:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMsg = { role: "user", text: input, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://127.0.0.1:8001/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          conversation_history: messages.map(msg => ({
            role: msg.role,
            content: msg.text
          }))
        }),
      })

      const data = await response.json()
      if (data.success) {
        const aiMsg = { role: "ai", text: data.reply, timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, aiMsg])
      } else {
        const errorMsg = { role: "ai", text: "Sorry, I'm having trouble connecting. Please try again.", timestamp: new Date().toISOString() }
        setMessages(prev => [...prev, errorMsg])
      }
    } catch (error) {
      const errorMsg = { role: "ai", text: "Sorry, I'm having trouble connecting. Please try again.", timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const createGoal = async () => {
    if (!newGoal.trim()) return

    try {
      const response = await fetch('http://127.0.0.1:8001/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal: newGoal,
          goal_type: goalType,
          category: goalCategory,
          priority: goalPriority,
          target_date: goalTargetDate || null,
          description: goalDescription || null
        }),
      })

      const data = await response.json()
      if (data.success) {
        setGoals(prev => [...prev, data.goal])
        resetGoalForm()
        fetchGoalStats()
      }
    } catch (error) {
      // Fallback: create goal locally
      const goal = {
        id: Date.now().toString(),
        goal: newGoal,
        type: goalType,
        category: goalCategory,
        priority: goalPriority,
        target_date: goalTargetDate,
        description: goalDescription,
        completed: false,
        created_at: new Date().toISOString(),
        progress: 0,
        streak: 0
      }
      setGoals(prev => [...prev, goal])
      resetGoalForm()
    }
  }

  const resetGoalForm = () => {
    setNewGoal('')
    setGoalType('daily')
    setGoalCategory('general')
    setGoalPriority('medium')
    setGoalTargetDate('')
    setGoalDescription('')
    setShowGoalForm(false)
    setEditingGoal(null)
  }

  const toggleGoalCompletion = async (goalId) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return

    const updatedGoal = { ...goal, completed: !goal.completed, progress: !goal.completed ? 100 : 0 }
    
    try {
      const response = await fetch(`http://127.0.0.1:8001/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal_id: goalId,
          completed: !goal.completed
        }),
      })

      if (response.ok) {
        setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g))
        fetchGoalStats()
      }
    } catch (error) {
      // Fallback: update locally
      setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g))
    }
  }

  const updateGoalProgress = async (goalId, progress) => {
    try {
      const response = await fetch(`http://127.0.0.1:8001/goals/${goalId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal_id: goalId,
          progress: progress
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGoals(prev => prev.map(g => g.id === goalId ? data.goal : g))
        fetchGoalStats()
      }
    } catch (error) {
      // Fallback: update locally
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress: progress, completed: progress === 100 } : g))
    }
  }

  const deleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return

    try {
      const response = await fetch(`http://127.0.0.1:8001/goals/${goalId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setGoals(prev => prev.filter(g => g.id !== goalId))
        fetchGoalStats()
      }
    } catch (error) {
      // Fallback: delete locally
      setGoals(prev => prev.filter(g => g.id !== goalId))
    }
  }

  const editGoal = (goal) => {
    setEditingGoal(goal)
    setNewGoal(goal.goal)
    setGoalType(goal.type)
    setGoalCategory(goal.category || 'general')
    setGoalPriority(goal.priority || 'medium')
    setGoalTargetDate(goal.target_date || '')
    setGoalDescription(goal.description || '')
    setShowGoalForm(true)
  }

  const completedGoals = goals.filter(g => g.completed).length
  const totalGoals = goals.length
  const progressPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Habit Coach</h1>
                <p className="text-sm text-gray-600">Your personal growth companion</p>
              </div>
            </div>
            
            {/* Progress Overview */}
            {totalGoals > 0 && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Today's Progress</div>
                <div className="text-2xl font-bold text-green-600">{completedGoals}/{totalGoals}</div>
                <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-2xl">
                <h2 className="text-lg font-semibold">Chat with your AI Coach</h2>
                {motivationQuote && (
                  <p className="text-sm opacity-90 mt-1">{motivationQuote}</p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Start a conversation with your AI habit coach!</p>
                    <p className="text-sm mt-2">Try: "Help me build a morning routine"</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`chat-message ${
                        msg.role === 'user' ? 'user-message' : 'ai-message'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="ai-message chat-message">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask your coach anything..."
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Goals Section */}
          <div className="space-y-6">
            {/* Goals Header */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-500" />
                  My Goals
                </h2>
                <button
                  onClick={() => setShowGoalForm(!showGoalForm)}
                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Goal Form */}
              {showGoalForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">
                    {editingGoal ? 'Edit Goal' : 'Add New Goal'}
                  </h3>
                  
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="What's your goal?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <textarea
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows="2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily Goal</option>
                      <option value="weekly">Weekly Goal</option>
                      <option value="monthly">Monthly Goal</option>
                    </select>
                    
                    <select
                      value={goalCategory}
                      onChange={(e) => setGoalCategory(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="health">Health</option>
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                      <option value="learning">Learning</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select
                      value={goalPriority}
                      onChange={(e) => setGoalPriority(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    
                    <input
                      type="date"
                      value={goalTargetDate}
                      onChange={(e) => setGoalTargetDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={createGoal}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      {editingGoal ? 'Update Goal' : 'Add Goal'}
                    </button>
                    <button
                      onClick={resetGoalForm}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Category Filter */}
              {goals.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Filter by category:</span>
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Goals List */}
              <div className="space-y-3">
                {filteredGoals.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>{goals.length === 0 ? 'No goals yet' : 'No goals in this category'}</p>
                    <p className="text-sm">{goals.length === 0 ? 'Add your first goal to get started!' : 'Try selecting a different category'}</p>
                  </div>
                ) : (
                  filteredGoals.map((goal) => (
                    <div key={goal.id} className="goal-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => toggleGoalCompletion(goal.id)}
                          className="mt-1"
                        >
                          {goal.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 hover:text-green-500" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${goal.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {goal.goal}
                              </p>
                              {goal.description && (
                                <p className="text-xs text-gray-600 mt-1">{goal.description}</p>
                              )}
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() => editGoal(goal)}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteGoal(goal.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                                goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {goal.priority}
                              </span>
                              <span className="text-xs text-gray-500 capitalize">{goal.category}</span>
                              <span className="text-xs text-gray-500 capitalize">{goal.type}</span>
                            </div>
                            
                            {goal.streak > 0 && (
                              <span className="text-xs text-orange-600 font-medium">
                                🔥 {goal.streak} day streak
                              </span>
                            )}
                          </div>
                          
                          {goal.target_date && (
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              Target: {new Date(goal.target_date).toLocaleDateString()}
                            </div>
                          )}
                          
                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              ></div>
                            </div>
                            {goal.progress > 0 && goal.progress < 100 && (
                              <div className="flex space-x-1 mt-2">
                                <button
                                  onClick={() => updateGoalProgress(goal.id, Math.max(0, goal.progress - 10))}
                                  className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                >
                                  -10%
                                </button>
                                <button
                                  onClick={() => updateGoalProgress(goal.id, Math.min(100, goal.progress + 10))}
                                  className="text-xs px-2 py-1 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                                >
                                  +10%
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Goal Statistics */}
            {goals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                    Statistics
                  </h3>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    {showStats ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{goalStats.total_goals || totalGoals}</div>
                    <div className="text-xs text-blue-700">Total Goals</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{goalStats.completed_goals || completedGoals}</div>
                    <div className="text-xs text-green-700">Completed</div>
                  </div>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg mb-4">
                  <div className="text-lg font-bold text-purple-600">
                    {goalStats.completion_rate ? `${Math.round(goalStats.completion_rate)}%` : `${Math.round(progressPercentage)}%`}
                  </div>
                  <div className="text-xs text-purple-700">Completion Rate</div>
                </div>
                
                {showStats && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Progress:</span>
                      <span className="font-medium">{goalStats.average_progress || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Streak:</span>
                      <span className="font-medium">🔥 {goalStats.total_streak || 0} days</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setInput("Help me create a morning routine")}
                  className="w-full text-left p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium text-blue-900">Morning Routine</div>
                  <div className="text-sm text-blue-700">Get help building a productive morning</div>
                </button>
                <button
                  onClick={() => setInput("I want to exercise more consistently")}
                  className="w-full text-left p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="font-medium text-green-900">Fitness Goals</div>
                  <div className="text-sm text-green-700">Build a sustainable workout habit</div>
                </button>
                <button
                  onClick={() => setInput("Help me stay focused at work")}
                  className="w-full text-left p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="font-medium text-purple-900">Focus & Productivity</div>
                  <div className="text-sm text-purple-700">Improve your work habits</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
