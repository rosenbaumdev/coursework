import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MD_COMPONENTS } from '../../markdown/readingMarkdown.jsx'

// Long-form reading material. Scrolls independently of the chat.
export default function ReadingCanvas({ payload }) {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {payload.markdown || ''}
        </ReactMarkdown>
      </div>
    </div>
  )
}
