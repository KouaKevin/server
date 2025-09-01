import Payment from '../models/Payment.js';
import Child from '../models/Child.js';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

export const getPayments = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      type,
      period, 
      status, 
      child,
      page = 1, 
      limit = 10 
    } = req.query;
    
    let query = {};
    
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (child) query.child = child;

    const payments = await Payment.find(query)
      .populate('child', 'firstName lastName class')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createPayment = async (req, res) => {
  try {
    const payment = await Payment.create({
      ...req.body,
      recordedBy: req.user.id
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('child', 'firstName lastName class parent')
      .populate('recordedBy', 'name');

    res.status(201).json(populatedPayment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const generateReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('child', 'firstName lastName class parent')
      .populate('recordedBy', 'name');

    if (!payment) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }

    const receiptTemplate = `
    <!DOCTYPE html>
    <html>
    
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bordereau de Versement</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 8mm; 
      }
      body {
        background: white !important;
        margin: 0;
        padding: 0; 
      }
      .receipt {
        page-break-inside: avoid;
      }
    }
  </style>
</head>

<body class="font-sans leading-relaxed max-w-full mx-auto p-4 bg-gray-100">

  
  <div class="receipt bg-white border border-gray-800 p-3 mb-3">
    
    <center>
      <div class="flex flex-col items-center">
        <img src="https://i.ibb.co/QFNM5Bgz/LOGO-TOUP-TI-page-0001.jpg" alt="LOGO-TOUP_TI" class="w-16 h-16">
        <div class="mb-1 w-full font-serif text-lg italic">
          Crèche - Garderie - Maternelle
        </div>
      </div>
    </center>
    <!-- Titre -->
    <div class="border border-gray-800 p-1 text-center font-bold mb-2">
      BORDEREAU DE PAIEMENT N° {{receiptNumber}}
    </div>

    <!-- Date -->
    <div class="text-right mb-2 text-xs">Le {{paymentDate}}</div>

    <!-- Informations -->
    <div class="text-[11px] flex mb-2 border-b border-gray-700 pb-2">
      <div class="w-1/2 flex-1">
        <center class="font-bold text-xs">ENFANTS</center>
        <div class="capitalize" ><span class="font-bold text-xs ">Nom: </span> {{child.firstName}} {{child.lastName}}</div>
        <div class="capitalize" ><span class="font-bold text-xs">Classe: </span> {{child.class}} </div>
        <div class="capitalize" ><span class="font-bold text-xs">Type de paiement: </span> {{type}} </div>
        <div class="capitalize" ><span class="font-bold text-xs">Pour la periode de: </span> {{period}}</div>
      </div>
      <div class="text-[11px] flex-1 w-1/2 pl-2 border-l border-gray-500">
        <center class="font-bold text-xs">CLIENT</center>
        <div class="capitalize"><span class="font-bold">Mr/Mme: </span> {{child.parent.name}} </div>
        <div class="capitalize"><span class="font-bold">TEL: </span> {{child.parent.phone}}</div>
        <div class="capitalize"><span class="font-bold">Adresse: </span> {{child.parent.address}}</div>
      </div>
    </div>

    <!-- Résumé -->
    <div class="flex justify-end mb-2">
      <div class="w-44 border border-gray-800">
        <div class="flex justify-between p-1 border-b border-gray-300 text-xs">
          <span>Montant :</span>
          <span>{{amount}} FCFA</span>
        </div>
      </div>
    </div>

    <div class="flex">
        <!-- Confirmation -->
      <div class="text-[11px] pr-2 w-2/3">
        Nous reconnaissons avoir reçu la somme de <span class="font-bold"> {{amount}} FCFA </span> au titre du règlement des frais de scolarité de  {{child.firstName}} {{child.lastName}} pour le mois de {{period}}.
      </div>

      <!-- Signatures -->
      <div class="flex justify-end gap-2 w-1/3">
        <div class="w-28 h-14 border border-gray-800 relative text-center">
          <div class="absolute bottom-1 inset-x-0 text-[9px]">Signature client</div>
        </div>
        <div class="w-28 h-14 border border-gray-800 relative text-center">
          <div class="absolute bottom-1 inset-x-0 text-[9px]">Signature caissier</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex text-[8px] mt-3 border-t border-gray-300 pt-2">
      <div class="w-1/2 mr-2">
        <div>SA AU CAPITAL DE 37 813 000 000 F CFA - RCCM B 157 - B.P. 359</div>
        <div>Avédji non loin de l'école la Jourdain - Tél: +228 90 73 50 50 / <br> 99 98 18 82</div>
        <div>Email: contact@touptitogo.com</div>
        <div>Web: www.touptitogo.com</div>
      </div>
      <div class="w-1/2 text-[8px]">
        <p class="font-bold">Pour toute réclamation vous pouvez:</p>
        <div>Appeler le +228 90 73 50 50 / 99 98 18 82</div>
        <div>Remplir le formulaire dédié aux réclamations sur notre site Web.</div>
        <div>Votre réclamation sera traitée dans les meilleurs délais et au plus tard dans les 30 jours.</div>
      </div>
    </div>
    <center><p class="pt-1 text-[11px] font-serif italic">Toupt'i grandir epanoui</p></center>
  </div>

  <!-- Ligne séparatrice -->
  <hr class="border-dashed border-gray-400 my-2">

  <!-- Reçu 2 -->
  
  <div class="receipt bg-white border border-gray-800 p-3 mb-3">
    
    <center>
      <div class="flex flex-col items-center">
        <img src="https://i.ibb.co/QFNM5Bgz/LOGO-TOUP-TI-page-0001.jpg" alt="LOGO-TOUP_TI" class="w-16 h-16">
        <div class="mb-1 w-full font-serif text-lg italic">
          Crèche - Garderie - Maternelle
        </div>
      </div>
    </center>
    <!-- Titre -->
    <div class="border border-gray-800 p-1 text-center font-bold mb-2">
      BORDEREAU DE PAIEMENT N° {{receiptNumber}}
    </div>

    <!-- Date -->
    <div class="text-right mb-2 text-xs">Le {{paymentDate}}</div>

    <!-- Informations -->
    <div class="text-[11px] flex mb-2 border-b border-gray-700 pb-2">
      <div class="w-1/2 flex-1">
        <center class="font-bold text-xs">ENFANTS</center>
        <div class="capitalize" ><span class="font-bold text-xs ">Nom: </span> {{child.firstName}} {{child.lastName}}</div>
        <div class="capitalize" ><span class="font-bold text-xs">Classe: </span> {{child.class}} </div>
        <div class="capitalize" ><span class="font-bold text-xs">Type de paiement: </span> {{type}} </div>
        <div class="capitalize" ><span class="font-bold text-xs">Pour la periode de: </span> {{period}}</div>
      </div>
      <div class="text-[11px] flex-1 w-1/2 pl-2 border-l border-gray-500">
        <center class="font-bold text-xs">CLIENT</center>
        <div class="capitalize"><span class="font-bold">Mr/Mme: </span> {{child.parent.name}} </div>
        <div class="capitalize"><span class="font-bold">TEL: </span> {{child.parent.phone}}</div>
        <div class="capitalize"><span class="font-bold">Adresse: </span> {{child.parent.address}}</div>
      </div>
    </div>

    <!-- Résumé -->
    <div class="flex justify-end mb-2">
      <div class="w-44 border border-gray-800">
        <div class="flex justify-between p-1 border-b border-gray-300 text-xs">
          <span>Montant :</span>
          <span>{{amount}} FCFA</span>
        </div>
      </div>
    </div>

    <div class="flex">
      <!-- Confirmation -->
      <div class="text-[11px] pr-2 w-2/3">
        Nous reconnaissons avoir reçu la somme de <span class="font-bold"> {{amount}} FCFA </span> au titre du règlement des frais de scolarité de  {{child.firstName}} {{child.lastName}} pour le mois de {{period}}.
      </div>

      <!-- Signatures -->
      <div class="flex justify-end gap-2 w-1/3">
        <div class="w-28 h-14 border border-gray-800 relative text-center">
          <div class="absolute bottom-1 inset-x-0 text-[9px]">Signature client</div>
        </div>
        <div class="w-28 h-14 border border-gray-800 relative text-center">
          <div class="absolute bottom-1 inset-x-0 text-[9px]">Signature caissier</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex text-[8px] mt-3 border-t border-gray-300 pt-2">
      <div class="w-1/2 mr-2">
        <div>SA AU CAPITAL DE 37 813 000 000 F CFA - RCCM B 157 - B.P. 359</div>
        <div>Avédji non loin de l'école la Jourdain - Tél: +228 90 73 50 50 / <br> 99 98 18 82</div>
        <div>Email: contact@touptitogo.com</div>
        <div>Web: www.touptitogo.com</div>
      </div>
      <div class="w-1/2 text-[8px]">
        <p class="font-bold">Pour toute réclamation vous pouvez:</p>
        <div>Appeler le +228 90 73 50 50 / 99 98 18 82</div>
        <div>Remplir le formulaire dédié aux réclamations sur notre site Web.</div>
        <div>Votre réclamation sera traitée dans les meilleurs délais et au plus tard dans les 30 jours.</div>
      </div>
    </div>
    <center><p class="pt-1 text-[11px] font-serif italic">Toupt'i grandir epanoui</p></center>
  </div>

</body>
</html>

    `;

    const template = handlebars.compile(receiptTemplate);
    const html = template({
      ...payment.toObject(),
      paymentDate: payment.paymentDate.toLocaleDateString('fr-FR')
    });

    // ⚠️ Puppeteer configuré pour Render
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html);
    let pdf = await page.pdf({ format: 'A4' });
    await browser.close();

    if (!Buffer.isBuffer(pdf)) {
      pdf = Buffer.from(pdf);
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=recu-${payment.receiptNumber}.pdf`
    });

    res.send(pdf);
  } catch (error) {
    console.error('Erreur PDF:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du reçu' });
  }
};


export const getDailyReport = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const payments = await Payment.find({
      paymentDate: { $gte: startDate, $lt: endDate }
    }).populate('child', 'firstName lastName class');

    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const summary = {
      date,
      totalPayments: payments.length,
      totalAmount,
      paymentsByMethod: {},
      paymentsByType: {}
    };

    payments.forEach(payment => {
      summary.paymentsByMethod[payment.paymentMethod] = 
        (summary.paymentsByMethod[payment.paymentMethod] || 0) + payment.amount;
      
      summary.paymentsByType[payment.type] = 
        (summary.paymentsByType[payment.type] || 0) + payment.amount;
    });

    res.json({ payments, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
