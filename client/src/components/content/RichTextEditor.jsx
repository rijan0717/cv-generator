import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import * as contentApi from '../../api/content.js';
import Alert from '../ui/Alert.jsx';

/**
 * The body editor: one flowing document with a toolbar, where an image
 * can be pasted, dropped or inserted anywhere in the text.
 *
 * It writes HTML, which the server sanitises against an allow-list
 * before storing — see `services/htmlSanitiser.js`. Nothing typed here
 * can become script on a reader's page, and an image can only ever
 * point at a file uploaded to this server.
 *
 * Images are uploaded the moment they arrive rather than on save, so
 * what the admin sees in the editor is the file the page will serve.
 *
 * @param {{value: string, onChange: (html: string) => void}} props
 */
export default function RichTextEditor({ value, onChange }) {
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Held in a ref so the paste and drop handlers, which are created
  // once when the editor mounts, always call the current one.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        // Anything a reader clicks leaves our site, so it opens in its
        // own tab and cannot reach back through `window.opener`.
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-xl' } }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
    ],
    content: value || '',
    onUpdate: ({ editor: instance }) => onChangeRef.current(instance.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose-editor min-h-[320px] w-full rounded-b-lg px-4 py-3 text-sm text-slate-900 focus:outline-none dark:text-slate-100',
      },
      handlePaste: (_view, event) => handleDropped(event.clipboardData?.files),
      handleDrop: (_view, event) => handleDropped(event.dataTransfer?.files),
    },
  });

  // The editor is created once; when the parent swaps in what the
  // server saved, its content has to be replaced rather than appended.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value || '', false);
  }, [value, editor]);

  /**
   * Uploads an image and puts it where the cursor is.
   * @param {File} file
   */
  async function insertImage(file) {
    setError('');
    setIsUploading(true);

    try {
      const url = await contentApi.uploadImage(file);
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * Handles a paste or a drop that carries files.
   *
   * Returns true when it took the event, which stops ProseMirror from
   * also inserting the file's name as text.
   *
   * @param {FileList|undefined} files
   * @returns {boolean} Whether this handled the event.
   */
  function handleDropped(files) {
    const image = [...(files ?? [])].find((file) => file.type.startsWith('image/'));
    if (!image) return false;

    insertImage(image);
    return true;
  }

  if (!editor) return null;

  return (
    <div className="rounded-lg ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-slate-900 dark:ring-slate-600 dark:focus-within:ring-slate-100">
      <Toolbar
        editor={editor}
        isUploading={isUploading}
        onPickImage={() => fileInputRef.current?.click()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) insertImage(file);
        }}
        className="sr-only"
      />

      <EditorContent editor={editor} />

      {error && (
        <div className="p-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Paste or drag a picture straight into the text to place it there.
      </p>
    </div>
  );
}

/**
 * The toolbar.
 *
 * Each button reports whether its mark is active, so the toolbar shows
 * the state of the cursor rather than only issuing commands — which is
 * what makes bold-on, type, bold-off feel like a word processor.
 *
 * @param {{editor: object, isUploading: boolean, onPickImage: () => void}} props
 */
function Toolbar({ editor, isUploading, onPickImage }) {
  /**
   * Asks for a URL and links the selection.
   *
   * `window.prompt` rather than a modal: it is one field, it is an
   * admin-only screen, and a dialog with its own focus management
   * would be more code than the feature is worth.
   */
  function setLink() {
    const previous = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Link address', previous);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-1.5 dark:border-slate-700">
      <Tool
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        label="Undo"
      >
        ↶
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        label="Redo"
      >
        ↷
      </Tool>

      <Divider />

      <Tool
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        label="Large heading"
      >
        H2
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        label="Small heading"
      >
        H3
      </Tool>

      <Divider />

      <Tool
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        label="Bold"
      >
        <strong>B</strong>
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        label="Italic"
      >
        <em>I</em>
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        label="Underline"
      >
        <span className="underline">U</span>
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        label="Strikethrough"
      >
        <span className="line-through">S</span>
      </Tool>

      <Divider />

      <Tool
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        label="Bulleted list"
      >
        •
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        label="Numbered list"
      >
        1.
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        label="Quote"
      >
        ❝
      </Tool>

      <Divider />

      {/* Alignment applies to the image as well as the text, which is
          how a picture ends up centred or off to one side. */}
      <Tool
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        label="Align left"
      >
        ≡
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        label="Align centre"
      >
        ⊟
      </Tool>
      <Tool
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        label="Align right"
      >
        ⊠
      </Tool>

      <Divider />

      <Tool onClick={setLink} active={editor.isActive('link')} label="Link">
        🔗
      </Tool>
      <Tool onClick={onPickImage} disabled={isUploading} label="Insert a picture">
        {isUploading ? '…' : '🖼'}
      </Tool>
    </div>
  );
}

/** A thin rule between groups of buttons. */
function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />;
}

/**
 * One toolbar button.
 * @param {{onClick: () => void, active?: boolean, disabled?: boolean,
 *          label: string, children: React.ReactNode}} props
 */
function Tool({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active ? 'true' : undefined}
      className={[
        'grid h-8 min-w-8 place-items-center rounded px-1.5 text-sm transition',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
