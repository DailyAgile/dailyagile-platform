'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './messages.module.css';

interface Message {
  id: string;
  message_type: string;
  subject: string;
  body: string;
  recipient_type: string;
  recipient_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface Student {
  id: string;
  email: string;
  name: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [messageType, setMessageType] = useState('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientType, setRecipientType] = useState('individual');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    loadStudents();
  }, []);

  async function loadMessages() {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        router.push('/teach/login');
        return;
      }

      const response = await fetch('/api/instructor/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push('/teach/login');
        return;
      }

      if (!response.ok) {
        setError('Failed to load messages');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.data?.messages || []);
      } else {
        setError(data.error || 'Failed to load messages');
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        return;
      }

      const response = await fetch('/api/instructor/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStudents(data.data?.students || []);
        }
      }
    } catch (err) {
      console.error('Error loading students:', err);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required');
      return;
    }

    if (recipientType !== 'all' && selectedStudents.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const token = localStorage.getItem('auth_token');

      if (!token) {
        router.push('/teach/login');
        return;
      }

      const response = await fetch('/api/instructor/send-bulk-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_type: messageType,
          subject,
          body,
          recipient_type: recipientType,
          recipient_ids: recipientType === 'all' ? [] : selectedStudents,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to send message');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Message sent to ${data.data?.recipient_count} student(s)`);
        // Reset form
        setSubject('');
        setBody('');
        setSelectedStudents([]);
        setMessageType('general');
        setRecipientType('individual');
        setShowCompose(false);

        // Reload messages
        setTimeout(() => {
          loadMessages();
          setSuccessMessage(null);
        }, 2000);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Image
            src="/dailyagile-logo.png"
            alt="DailyAgile Logo"
            width={40}
            height={40}
            className={styles.logo}
          />
          <div className={styles.titleSection}>
            <h1>Messages</h1>
            <p>Send messages to your students</p>
          </div>
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className={styles.composeBtn}
        >
          {showCompose ? 'Cancel' : 'Compose Message'}
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={styles.successAlert}>
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorAlert}>
          {error}
          <button onClick={() => setError(null)} className={styles.closeBtn}>×</button>
        </div>
      )}

      <div className={styles.content}>
        {/* Compose Section */}
        {showCompose && (
          <div className={styles.composeSection}>
            <h2>Compose Message</h2>
            <form onSubmit={handleSendMessage}>
              <div className={styles.formGroup}>
                <label>Message Type</label>
                <select value={messageType} onChange={(e) => setMessageType(e.target.value)}>
                  <option value="general">General</option>
                  <option value="reminder">Reminder</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Message subject"
                  maxLength={200}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  maxLength={5000}
                  rows={6}
                />
                <div className={styles.charCount}>
                  {body.length} / 5000 characters
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Send To</label>
                <div className={styles.recipientOptions}>
                  <label>
                    <input
                      type="radio"
                      value="individual"
                      checked={recipientType === 'individual'}
                      onChange={(e) => setRecipientType(e.target.value)}
                    />
                    Individual / Group
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="all"
                      checked={recipientType === 'all'}
                      onChange={(e) => setRecipientType(e.target.value)}
                    />
                    All Students
                  </label>
                </div>
              </div>

              {recipientType === 'individual' && (
                <div className={styles.studentSelector}>
                  <div className={styles.selectAllRow}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === students.length}
                        onChange={selectAll}
                      />
                      Select All ({students.length} students)
                    </label>
                  </div>
                  <div className={styles.studentList}>
                    {students.map((student) => (
                      <label key={student.id} className={styles.studentItem}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                        />
                        <span>{student.name || student.email}</span>
                      </label>
                    ))}
                  </div>
                  <div className={styles.selectedCount}>
                    {selectedStudents.length} selected
                  </div>
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="submit"
                  disabled={sending}
                  className={styles.sendBtn}
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompose(false);
                    setSubject('');
                    setBody('');
                    setSelectedStudents([]);
                  }}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Messages List */}
        <div className={styles.messagesList}>
          <h2>Message History</h2>

          {loading ? (
            <div className={styles.loading}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className={styles.empty}>
              No messages sent yet. Compose your first message!
            </div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div className={styles.col1}>Subject</div>
                <div className={styles.col2}>Type</div>
                <div className={styles.col3}>Recipients</div>
                <div className={styles.col4}>Sent</div>
              </div>
              {messages.map((message) => (
                <div key={message.id} className={styles.tableRow}>
                  <div className={styles.col1}>{message.subject}</div>
                  <div className={styles.col2}>
                    <span className={styles.badge}>{message.message_type}</span>
                  </div>
                  <div className={styles.col3}>{message.recipient_count}</div>
                  <div className={styles.col4}>
                    {message.sent_at
                      ? new Date(message.sent_at).toLocaleDateString()
                      : 'Draft'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
