export const buildGuiaHtml = (pedido) => {
  const guia = pedido?.attributes?.guia || '';
  const origen =
    pedido?.attributes?.direccion_origen?.data?.attributes?.direccion || '';
  const destino =
    pedido?.attributes?.direccion_destino?.data?.attributes?.direccion || '';

  return `
    <html>
      <head>
        <title>Imprimir Guía ${guia}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; }
          pre { white-space: pre-wrap; }
          .box { border: 1px solid #333; padding: 12px; margin-bottom: 10px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>Guía: ${guia}</h1>
        <div class="box"><strong>Origen:</strong><pre>${origen}</pre></div>
        <div class="box"><strong>Destino:</strong><pre>${destino}</pre></div>
        <div class="box"><strong>Pedido ID:</strong> ${pedido?.id}</div>
      </body>
    </html>
  `;
};

export const printGuia = (pedido) => {
  if (!pedido) return;

  const html = buildGuiaHtml(pedido);

  const w = window.open('', '_blank');
  if (!w) return;

  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
};
