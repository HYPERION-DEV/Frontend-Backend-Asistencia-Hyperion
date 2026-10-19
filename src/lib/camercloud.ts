// src/lib/camercloud.ts
import https from 'https';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SignatureRequestResponse {
  authCode: string;
  exeCode: string;
}

interface ExecuteSignatureResponse {
  bytesB64: string;
  signatureCode: string;
  mimeType: string;
  ref: string;
}

export class CamercloudService {
  private static endpoint = (process.env.CAMERCLOUD_ENDPOINT || 'https://camercloud.camerfirma.com/fortress').trim();
  private static clientId = (process.env.CAMERCLOUD_CLIENT_ID || 'CAMERFIRMACOLOMBIACAMERCLOUD').trim();
  private static clientSecret = (process.env.CAMERCLOUD_CLIENT_SECRET || 'dad1e8a184d445ac84c17459ceef22dd').trim();
  private static certificateCode = (process.env.CAMERCLOUD_CERTIFICATE_CODE || '682ef07a0fff4a6a897d7537b5452ee7').trim();

  /**
   * Petición HTTP nativa HTTPS sin sobreescritura de Content-Length
   */
  private static httpRequest<T>(
    urlStr: string,
    method: 'GET' | 'POST',
    headers: Record<string, string>,
    bodyData?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(urlStr);
      const postData = bodyData ? Buffer.from(bodyData, 'utf-8') : undefined;

      const finalHeaders: Record<string, string> = {
        ...headers,
      };

      if (postData) {
        finalHeaders['Content-Length'] = String(postData.length);
      }

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: method,
        rejectUnauthorized: false,
        headers: finalHeaders,
      };

      const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(responseBody);
              resolve(json as T);
            } catch (e) {
              resolve(responseBody as unknown as T);
            }
          } else {
            console.error(`==== ERROR RESPONSE CAMERCLOUD (${res.statusCode}) ====`, responseBody);
            reject(new Error(`Camercloud API Error (${res.statusCode}): ${responseBody}`));
          }
        });
      });

      req.on('error', (err) => {
        console.error('==== ERROR SOCKET HTTPS ====', err);
        reject(err);
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  /**
   * PASO 1: Obtener Token OAuth2 de Camercloud
   */
  private static async getAccessToken(): Promise<string> {
    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'client',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: 'https://camercloud.camerfirma.com/fortress',
    });

    try {
      const data = await this.httpRequest<TokenResponse>(
        `${this.endpoint}/oauth2/v1/token`,
        'POST',
        {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          'Accept': 'application/json',
        },
        bodyParams.toString()
      );

      return data.access_token.trim();
    } catch (error: any) {
      console.error('==== ERROR EN GET_ACCESS_TOKEN ====');
      console.error(error.message || error);
      console.error('===================================');
      throw new Error(`Fallo de autenticación en Camercloud: ${error.message}`);
    }
  }

  /**
   * PASO 2 y 3: Solicitar y Ejecutar la Firma Desatendida (PAdES B)
   */
  public static async signPdfDocument(
    pdfBase64: string,
    documentName: string = 'papeleta_permiso.pdf'
  ): Promise<{ signedPdfBase64: string; signatureCode: string }> {
    const accessToken = await this.getAccessToken();
    const cleanBase64 = pdfBase64
      .replace(/^data:application\/pdf;base64,/, '')
      .replace(/[\r\n\t ]/g, '');

    const signaturePayload = {
      certificateCode: this.certificateCode,
      signatureConfigurations: [
        {
          ref: 'PERMIT_DOC_1',
          document: {
            bytesB64: cleanBase64,
            name: documentName.trim(),
          },
          signatureType: 'PADES_B',
          signatureAlgorithm: 'RSA_SHA256',
          packaging: 'ENVELOPED',
          padesConfiguration: {
            stamper: {
              page: 1,
              type: 'QR_BARCODE128',
              xAxis: 80,
              yAxis: 700,
              textLine1: 'Firmado Digitalmente mediante Camercloud',
              textLine2: 'Validez Legal SUNAFIL / ISO 27001',
            },
          },
        },
      ],
    };

    // 1. Solicitar Firma
    const sigData = await this.httpRequest<SignatureRequestResponse>(
      `${this.endpoint}/api/v1/signature`,
      'POST',
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      JSON.stringify(signaturePayload)
    );

    const exeCode = sigData.exeCode.trim();

    // 2. Ejecutar Firma
    const execDataResponse = await this.httpRequest<ExecuteSignatureResponse | ExecuteSignatureResponse[]>(
      `${this.endpoint}/api/v1/signature/${exeCode}/execute`,
      'POST',
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      JSON.stringify({})
    );

    const result = Array.isArray(execDataResponse) ? execDataResponse[0] : execDataResponse;

    return {
      signedPdfBase64: result.bytesB64,
      signatureCode: result.signatureCode,
    };
  }

  /**
   * Descarga el PDF firmado desde Camercloud
   */
  /**
 * Descarga el PDF firmado directamente desde Camercloud pasando el Bearer Token
 */
/**
 * Descarga los bytes del PDF firmado desde Camercloud
 */
public static async downloadSignedDocument(signatureCode: string): Promise<Buffer> {
  const accessToken = await this.getAccessToken();

  return new Promise((resolve, reject) => {
    const url = new URL(`${this.endpoint}/api/v1/signature/download/${signatureCode.trim()}`);

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/octet-stream, application/pdf',
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      res.on('end', () => {
        const resultBuffer = Buffer.concat(chunks);
        resolve(resultBuffer);
      });
    });

    req.on('error', (err) => {
      console.error('Error de socket al descargar el PDF:', err);
      reject(err);
    });

    req.end();
  });
}
}