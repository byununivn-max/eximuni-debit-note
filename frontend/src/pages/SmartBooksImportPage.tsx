import React, { useState } from 'react';
import {
  Card, Typography, Button, Upload, Table, Tag, Space,
  Row, Col, Statistic, Alert, message, Steps, Result,
} from 'antd';
import {
  UploadOutlined, CloudUploadOutlined, CheckCircleOutlined,
  FileExcelOutlined, DatabaseOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const { Title, Text } = Typography;

interface PreviewRow {
  Module: string;
  'Batch Nbr': string;
  'Ref Nbr': string;
  'Acct Period': string;
  'Voucher Date': string;
  Account: string;
  'Dr Amount': number;
  'Cr Amount': number;
  'Description VN': string;
  [key: string]: any;
}

interface ImportResult {
  entries_created: number;
  lines_created: number;
  errors: string[];
  skipped: number;
}

const SmartBooksImportPage: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [step, setStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);

  /** Excel 파일 파싱 (프론트엔드에서 XLSX 읽기) */
  const handleFileUpload = async (file: File) => {
    setParsing(true);
    try {
      // xlsx 라이브러리가 없으므로 JSON 업로드 방식으로 대체
      // 실제 환경에서는 xlsx 라이브러리로 클라이언트 파싱 또는 서버 파싱
      const text = await file.text();
      const rows = JSON.parse(text);

      if (!Array.isArray(rows) || rows.length === 0) {
        message.error('Invalid JSON array format');
        return;
      }

      setPreviewData(rows);
      setStep(1);
      message.success(t('common:message.success'));
    } catch (err) {
      message.error(t('common:message.importFailed'));
    } finally {
      setParsing(false);
    }

    return false; // Ant Design Upload 기본 동작 방지
  };

  /** SmartBooks 임포트 실행 */
  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await api.post('/api/v1/journal-entries/import-gltran', previewData);
      setResult(res.data);
      setStep(2);
      message.success(t('common:message.importSuccess'));
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setFileList([]);
    setPreviewData([]);
    setResult(null);
  };

  // 미리보기 컬럼 (주요 필드만)
  const previewColumns = [
    { title: 'Module', dataIndex: 'Module', key: 'mod', width: 70 },
    { title: 'Batch Nbr', dataIndex: 'Batch Nbr', key: 'batch', width: 100 },
    { title: 'Ref Nbr', dataIndex: 'Ref Nbr', key: 'ref', width: 120 },
    { title: 'Acct Period', dataIndex: 'Acct Period', key: 'period', width: 100 },
    {
      title: 'Account', dataIndex: 'Account', key: 'acct', width: 90,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Dr Amount', dataIndex: 'Dr Amount', key: 'dr',
      width: 130, align: 'right' as const,
      render: (v: number) => v ? Number(v).toLocaleString() : '-',
    },
    {
      title: 'Cr Amount', dataIndex: 'Cr Amount', key: 'cr',
      width: 130, align: 'right' as const,
      render: (v: number) => v ? Number(v).toLocaleString() : '-',
    },
    {
      title: 'Description VN', dataIndex: 'Description VN', key: 'desc',
      ellipsis: true,
    },
  ];

  // 미리보기 요약 통계
  const previewStats = {
    totalRows: previewData.length,
    modules: Array.from(new Set(previewData.map(r => r.Module))),
    entries: new Set(
      previewData.map(r => `${r.Module}|${r['Batch Nbr']}|${r['Ref Nbr']}`)
    ).size,
    totalDebit: previewData.reduce((s, r) => s + Number(r['Dr Amount'] || 0), 0),
    totalCredit: previewData.reduce((s, r) => s + Number(r['Cr Amount'] || 0), 0),
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <DatabaseOutlined style={{ marginRight: 8 }} />
        {t('accounting:smartbooksImport.title')}
      </Title>

      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: t('accounting:smartbooksImport.stepUpload'), icon: <FileExcelOutlined /> },
          { title: t('accounting:smartbooksImport.stepPreview'), icon: <CloudUploadOutlined /> },
          { title: t('accounting:smartbooksImport.stepComplete'), icon: <CheckCircleOutlined /> },
        ]}
      />

      {/* Step 0: 파일 업로드 */}
      {step === 0 && (
        <Card>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
            message={t('accounting:smartbooksImport.alertTitle')}
            description={
              <div>
                <p>{t('accounting:smartbooksImport.alertDescription1')}</p>
                <p>{t('accounting:smartbooksImport.alertDescription2')}</p>
                <p>{t('accounting:smartbooksImport.alertDescription3')}</p>
              </div>
            }
          />
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Upload
              accept=".json"
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([file]);
                handleFileUpload(file);
                return false;
              }}
              onRemove={() => {
                setFileList([]);
                setPreviewData([]);
              }}
              maxCount={1}
            >
              <Button
                icon={<UploadOutlined />}
                size="large"
                loading={parsing}
              >
                {t('accounting:smartbooksImport.selectFile')}
              </Button>
            </Upload>
          </div>
        </Card>
      )}

      {/* Step 1: 미리보기 */}
      {step === 1 && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title={t('accounting:smartbooksImport.totalRows')} value={previewStats.totalRows} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title={t('accounting:smartbooksImport.entryCount')} value={previewStats.entries} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={t('accounting:smartbooksImport.debitTotal')}
                  value={previewStats.totalDebit}
                  formatter={(v) => Number(v).toLocaleString()}
                  valueStyle={{ fontSize: 16 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={t('accounting:smartbooksImport.creditTotal')}
                  value={previewStats.totalCredit}
                  formatter={(v) => Number(v).toLocaleString()}
                  valueStyle={{ fontSize: 16 }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            title={t('accounting:smartbooksImport.previewTitle', { count: previewData.length })}
            extra={
              <Space>
                <Text type="secondary">
                  {t('common:table.module')}: {previewStats.modules.join(', ')}
                </Text>
              </Space>
            }
          >
            <Table
              columns={previewColumns}
              dataSource={previewData.slice(0, 100)}
              rowKey={(_, i) => String(i)}
              pagination={false}
              size="small"
              scroll={{ x: 900, y: 400 }}
            />
            {previewData.length > 100 && (
              <div style={{ textAlign: 'center', padding: 8, color: '#999' }}>
                {t('accounting:smartbooksImport.previewNote', { count: previewData.length })}
              </div>
            )}
          </Card>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space>
              <Button onClick={handleReset}>
                {t('common:button.cancel')}
              </Button>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={importing}
                onClick={handleImport}
                size="large"
              >
                {t('accounting:smartbooksImport.importButton', { count: previewStats.entries })}
              </Button>
            </Space>
          </div>
        </>
      )}

      {/* Step 2: 결과 */}
      {step === 2 && result && (
        <Card>
          <Result
            status={result.errors.length === 0 ? 'success' : 'warning'}
            title={t('accounting:smartbooksImport.importComplete')}
            subTitle={t('accounting:smartbooksImport.importResult', {
              entries: result.entries_created,
              lines: result.lines_created,
              skipped: result.skipped,
            })}
            extra={[
              <Button
                key="again"
                onClick={handleReset}
              >
                {t('accounting:smartbooksImport.additionalImport')}
              </Button>,
              <Button
                key="view"
                type="primary"
                onClick={() => window.location.href = '/journal-entries'}
              >
                {t('accounting:smartbooksImport.viewJournal')}
              </Button>,
            ]}
          />
          {result.errors.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={t('accounting:smartbooksImport.warningCount', { count: result.errors.length })}
              description={
                <ul style={{ maxHeight: 200, overflow: 'auto' }}>
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              }
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default SmartBooksImportPage;
