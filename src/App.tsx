import Counter from './components/Counter.tsx'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>my-project</h1>
      </header>

      <main className="app-main">
        <p>
          <code>src/App.tsx</code>를 수정하면 화면이 바로 바뀝니다.
        </p>
        <Counter />
      </main>
    </div>
  )
}

export default App
