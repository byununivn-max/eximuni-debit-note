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
        message.error('유효한 JSON 배열 형식이 아닙니다');
        return;
      }

      setPreviewData(rows);
      setStep(1);
      message.success(`${rows.length}행 파싱 완료`);
    } catch (err) {
      message.error('파일 파싱 실패 — JSON 배열 형식으로 변환 후 업로드하세요');
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
      message.success('임포트 완료');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '임포트 실패');
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
        SmartBooks 데이터 임포트
      </Title>

      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: '파일 업로드', icon: <FileExcelOutlined /> },
          { title: '미리보기', icon: <CloudUploadOutlined /> },
          { title: '완료', icon: <CheckCircleOutlined /> },
        ]}
      />

      {/* Step 0: 파일 업로드 */}
      {step === 0 && (
        <Card>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
            message="SmartBooks GLTran 데이터 임포트"
            description={
              <div>
                <p>GLTran.xlsx를 JSON 배열로 변환하여 업로드합니다.</p>
                <p>필수 컬럼: Module, Batch Nbr, Ref Nbr, Acct Period, Account, Dr Amount, Cr Amount</p>
                <p>선택 컬럼: Voucher Date, Description VN/EN/KR, Vendor/Customer/Employee ID, Cost Center, Invoice No 등</p>
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
                GLTran JSON 파일 선택
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
                <Statistic title="전체 행" value={previewStats.totalRows} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="전표 수" value={previewStats.entries} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="차변 합계"
                  value={previewStats.totalDebit}
                  formatter={(v) => Number(v).toLocaleString()}
                  valueStyle={{ fontSize: 16 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="대변 합계"
                  value={previewStats.totalCredit}
                  formatter={(v) => Number(v).toLocaleString()}
                  valueStyle={{ fontSize: 16 }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            size="small"
            title={`미리보기 (${previewData.length}행)`}
            extra={
              <Space>
                <Text type="secondary">
                  모듈: {previewStats.modules.join(', ')}
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
                처음 100행만 표시됩니다 (전체: {previewData.length}행)
              </div>
            )}
          </Card>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space>
              <Button onClick={handleReset}>
                취소
              </Button>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={importing}
                onClick={handleImport}
                size="large"
              >
                {previewStats.entries}건 전표 임포트 실행
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
            title="SmartBooks 임포트 완료"
            subTitle={
              `전표 ${result.entries_created}건, ` +
              `라인 ${result.lines_created}건 생성 ` +
              `(${result.skipped}건 스킵)`
            }
            extra={[
              <Button
                key="again"
                onClick={handleReset}
              >
                추가 임포트
              </Button>,
              <Button
                key="view"
                type="primary"
                onClick={() => window.location.href = '/journal-entries'}
              >
                분개전표 보기
              </Button>,
            ]}
          />
          {result.errors.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${result.errors.length}건 경고`}
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
