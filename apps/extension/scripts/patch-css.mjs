import { readFileSync, writeFileSync } from 'fs'

const cssPath = 'apps/extension/sidepanel.css'
const content = readFileSync(cssPath, 'utf-8')

const newSection = `/* \u2500\u2500 SCREENSHOT BLOCK \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.screenshot-block {
  display: block;
  position: relative;
  margin: 10px 0;
  border: 1px solid var(--border-bright);
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--raised);
  user-select: none;
}

/* TipTap NodeViewWrapper wraps the figure \u2014 ensure it renders as block */
.screenshot-block,
[data-node-view-wrapper] figure.screenshot-block {
  display: block;
}

.screenshot-block img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  pointer-events: none;
}

/* Footer row: timestamp + caption/button */
.screenshot-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-top: 1px solid var(--border);
  min-height: 30px;
  flex-wrap: wrap;
}

.screenshot-timestamp {
  font-size: 10.5px;
  color: var(--text-3);
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

/* "Add Caption" inline button */
.screenshot-add-caption-btn {
  font-size: 10.5px;
  color: var(--accent);
  background: transparent;
  border: 1px dashed rgba(108, 99, 255, 0.4);
  border-radius: 4px;
  padding: 2px 7px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  line-height: 1.4;
}
.screenshot-add-caption-btn:hover {
  background: rgba(108, 99, 255, 0.1);
  border-color: var(--accent);
}

/* Caption textarea */
.screenshot-caption-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-bright);
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 10.5px;
  line-height: 1.5;
  resize: none;
  padding: 2px 0;
  outline: none;
  letter-spacing: 0.02em;
}
.screenshot-caption-input::placeholder {
  color: var(--text-3);
  font-style: italic;
}

.screenshot-remove {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(0,0,0,0.65);
  border: 1px solid rgba(255,255,255,0.18);
  color: var(--text-2);
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;
  transition: background 0.15s, color 0.15s;
  line-height: 1;
}
.screenshot-remove:hover {
  background: var(--red-lo);
  color: var(--red);
  border-color: rgba(240,68,68,0.4);
}

/* TipTap drag handle cursor on screenshot block */
.screenshot-block[data-drag-handle] {
  cursor: grab;
}
.screenshot-block[data-drag-handle]:active {
  cursor: grabbing;
}

/* \u2500\u2500 TIPTAP EDITOR RESET \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* The .unified-editor class is applied via editorProps.attributes */
.tiptap.unified-editor {
  outline: none;
  min-height: 80px;
  padding: 0;
}
.tiptap.unified-editor p {
  margin: 0 0 6px;
}
.tiptap.unified-editor h1,
.tiptap.unified-editor h2,
.tiptap.unified-editor h3 {
  margin: 0 0 6px;
}
.tiptap.unified-editor ul,
.tiptap.unified-editor ol {
  padding-left: 20px;
  margin: 0 0 6px;
}
.tiptap.unified-editor pre {
  background: var(--raised);
  border-radius: var(--r-sm);
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  margin: 0 0 6px;
  white-space: pre-wrap;
  word-break: break-word;
}
.tiptap.unified-editor code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--raised);
  border-radius: 3px;
  padding: 1px 4px;
}
.tiptap.unified-editor a {
  color: var(--accent);
  text-decoration: underline;
}
`

const result = content.slice(0, 14453) + newSection + content.slice(15649)
writeFileSync(cssPath, result, 'utf-8')
console.log('CSS patched successfully')
