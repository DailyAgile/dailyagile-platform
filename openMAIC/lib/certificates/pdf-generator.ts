/**
 * Certificate PDF Generator Service
 * Generates professional PDF certificates with DailyAgile branding
 */

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { createLogger } from '@/lib/logger';

const log = createLogger('CertificatePDFGenerator');

// DailyAgile Brand Colors
const COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkText: '#1E293B',
  white: '#FFFFFF',
};

// Fonts - using standard PDF fonts for consistency
const FONTS = {
  header: 'Helvetica-Bold',
  body: 'Helvetica',
  mono: 'Courier',
};

export interface CertificateData {
  studentName: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  completionDate: string;
  certificateId: string;
}

/**
 * Generate a PDF certificate stream
 * @param data - Certificate data (name, quiz, score, date, etc.)
 * @returns Readable stream of PDF bytes
 */
export async function generateCertificatePDF(data: CertificateData): Promise<Readable> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      // Handle errors
      doc.on('error', (err) => {
        log.error('PDF generation error:', err);
        reject(err);
      });

      // Render certificate content
      renderCertificate(doc, data);

      // End document and return stream
      doc.end();

      resolve(doc as any);
    } catch (error) {
      log.error('Failed to create certificate PDF:', error);
      reject(error);
    }
  });
}

/**
 * Render certificate content on the PDF
 */
function renderCertificate(doc: InstanceType<typeof PDFDocument>, data: CertificateData): void {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  const centerX = pageWidth / 2;

  // Add decorative border
  addBorder(doc, pageWidth, pageHeight);

  // Add DailyAgile branding (header)
  addHeader(doc, centerX, 80);

  // Add main certificate text
  doc.fontSize(36)
    .font(FONTS.header)
    .fillColor(COLORS.navy)
    .text('Certificate of Completion', { align: 'center' });

  doc.moveDown(0.5);

  // Add descriptive text
  doc.fontSize(14)
    .font(FONTS.body)
    .fillColor(COLORS.darkText)
    .text('This certifies that', { align: 'center' });

  doc.moveDown(0.5);

  // Add student name in highlighted box
  addHighlightedText(doc, data.studentName, centerX);

  doc.moveDown(0.5);

  // Add descriptive text
  doc.fontSize(14)
    .font(FONTS.body)
    .fillColor(COLORS.darkText)
    .text('has successfully completed', { align: 'center' });

  doc.moveDown(0.5);

  // Add quiz title in highlighted box
  addHighlightedText(doc, data.quizTitle, centerX);

  doc.moveDown(1);

  // Add score information
  const scorePercentage = Math.round((data.score / data.maxScore) * 100);
  const scoreText = `Score: ${data.score}/${data.maxScore} (${scorePercentage}%)`;

  doc.fontSize(12)
    .font(FONTS.body)
    .fillColor(COLORS.darkText)
    .text(scoreText, { align: 'center' });

  // Add completion date
  const formattedDate = formatDate(data.completionDate);
  doc.fontSize(12)
    .font(FONTS.body)
    .fillColor(COLORS.darkText)
    .text(`Date Completed: ${formattedDate}`, { align: 'center' });

  doc.moveDown(1.5);

  // Add certificate ID
  doc.fontSize(10)
    .font(FONTS.mono)
    .fillColor(COLORS.gray)
    .text(`Certificate ID: ${data.certificateId}`, { align: 'center' });

  // Add footer
  addFooter(doc, pageHeight);
}

/**
 * Add decorative border to certificate
 */
function addBorder(doc: InstanceType<typeof PDFDocument>, pageWidth: number, pageHeight: number): void {
  const margin = 30;

  // Outer border (navy)
  doc.lineWidth(3)
    .strokeColor(COLORS.navy)
    .rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
    .stroke();

  // Inner accent line (teal)
  const innerMargin = margin + 8;
  doc.lineWidth(1)
    .strokeColor(COLORS.teal)
    .rect(innerMargin, innerMargin, pageWidth - 2 * innerMargin, pageHeight - 2 * innerMargin)
    .stroke();
}

/**
 * Add DailyAgile branding header
 */
function addHeader(doc: InstanceType<typeof PDFDocument>, centerX: number, yPosition: number): void {
  // DailyAgile logo/text
  doc.fontSize(20)
    .font(FONTS.header)
    .fillColor(COLORS.teal)
    .text('DailyAgile', centerX - 50, yPosition, { width: 100, align: 'center' });

  // Tagline
  doc.fontSize(9)
    .font(FONTS.body)
    .fillColor(COLORS.gray)
    .text('Accelerate Business Agility', centerX - 50, yPosition + 25, { width: 100, align: 'center' });

  // Horizontal divider
  doc.moveTo(100, yPosition + 45)
    .lineTo(centerX * 2 - 100, yPosition + 45)
    .strokeColor(COLORS.teal)
    .lineWidth(1)
    .stroke();
}

/**
 * Add highlighted text box (for names and titles)
 */
function addHighlightedText(doc: InstanceType<typeof PDFDocument>, text: string, centerX: number): void {
  const boxWidth = 400;
  const boxHeight = 50;
  const boxX = centerX - boxWidth / 2;
  const boxY = doc.y;

  // Light background
  doc.fillColor(COLORS.light)
    .rect(boxX, boxY, boxWidth, boxHeight)
    .fill();

  // Border
  doc.strokeColor(COLORS.teal)
    .lineWidth(2)
    .rect(boxX, boxY, boxWidth, boxHeight)
    .stroke();

  // Text
  doc.fontSize(18)
    .font(FONTS.header)
    .fillColor(COLORS.navy)
    .text(text, boxX + 20, boxY + 12, {
      width: boxWidth - 40,
      align: 'center',
    });

  doc.moveDown(3);
}

/**
 * Add footer with signature line and copyright
 */
function addFooter(doc: InstanceType<typeof PDFDocument>, pageHeight: number): void {
  const footerY = pageHeight - 120;

  // Signature line
  doc.moveTo(100, footerY)
    .lineTo(250, footerY)
    .strokeColor(COLORS.darkText)
    .lineWidth(1)
    .stroke();

  doc.fontSize(10)
    .font(FONTS.body)
    .fillColor(COLORS.darkText)
    .text('Authorized Signature', 100, footerY + 5);

  // DailyAgile info
  doc.fontSize(9)
    .font(FONTS.body)
    .fillColor(COLORS.gray)
    .text('DailyAgile | Accelerate Business Agility', 100, footerY + 40, { align: 'center' });

  doc.fontSize(8)
    .font(FONTS.body)
    .fillColor(COLORS.gray)
    .text('© 2026 DailyAgile. All rights reserved.', 100, footerY + 55, { align: 'center' });
}

/**
 * Format date for display (e.g., "August 28, 2026")
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
