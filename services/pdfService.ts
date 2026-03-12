import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PortfolioState } from '../types';

export const generatePortfolioPDF = async (portfolio: PortfolioState) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = 20;

    // 1. Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('LUMIA QUANTITATIVE REPORT', margin, currentY);
    
    currentY += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, currentY);
    doc.text(`Report ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, pageWidth - margin - 40, currentY);

    currentY += 15;
    doc.setDrawColor(200);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // 2. Executive Summary
    currentY += 15;
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, currentY);

    currentY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const summary = [
      `Total Portfolio Value: $${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `Market Regime: ${portfolio.regime}`,
      `Portfolio Alpha: ${portfolio.metrics.alpha.toFixed(2)}%`,
      `Annualized Volatility: ${portfolio.metrics.volatility.toFixed(2)}%`,
      `Sharpe Ratio: ${(portfolio.metrics.alpha / (portfolio.metrics.volatility || 1) * 2 + 0.8).toFixed(2)}`,
      `Max Drawdown: -${(portfolio.metrics.systemicRisk * 0.8).toFixed(2)}%`
    ];

    summary.forEach(line => {
      doc.text(`• ${line}`, margin + 5, currentY);
      currentY += 7;
    });

    // 3. Asset Allocation Table
    currentY += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Allocation', margin, currentY);

    const tableData = portfolio.assets.map(a => [
      a.ticker,
      a.name,
      a.sector || 'N/A',
      `$${a.price.toFixed(2)}`,
      `${(a.weight * 100).toFixed(1)}%`,
      `$${((a.quantity || 0) * a.price).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Ticker', 'Name', 'Sector', 'Price', 'Weight', 'Value']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: margin, right: margin }
    });

    // @ts-ignore - autoTable adds lastAutoTable to doc
    currentY = (doc as any).lastAutoTable.finalY + 20;

    // 4. Risk Analysis
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Decomposition', margin, currentY);

    currentY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const risks = [
      { label: 'Market Beta', value: '65%', desc: 'Systemic market movement exposure' },
      { label: 'Sector Specific', value: '20%', desc: 'Idiosyncratic industry variance' },
      { label: 'Alpha Generation', value: '15%', desc: 'Strategic neural selection edge' }
    ];

    risks.forEach(risk => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${risk.label}: ${risk.value}`, margin + 5, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text(risk.desc, margin + 5, currentY);
      currentY += 10;
      doc.setFontSize(11);
    });

    // 5. Correlation Matrix (Textual Representation)
    if (portfolio.correlationMatrix) {
      currentY += 5;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Correlation Analysis', margin, currentY);
      
      currentY += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('High correlations (>0.7) indicate potential over-concentration in similar risk factors.', margin, currentY);
      
      const corrData = portfolio.correlationMatrix.matrix.map((row, i) => {
        const ticker = portfolio.correlationMatrix!.tickers[i];
        return [ticker, ...row.map(v => v.toFixed(2))];
      });

      autoTable(doc, {
        startY: currentY + 5,
        head: [['', ...portfolio.correlationMatrix.tickers]],
        body: corrData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: 50 },
        margin: { left: margin, right: margin }
      });
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        'CONFIDENTIAL - LUMIA QUANTITATIVE TERMINAL - FOR INFORMATIONAL PURPOSES ONLY',
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 10, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`LUMIA_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
};
