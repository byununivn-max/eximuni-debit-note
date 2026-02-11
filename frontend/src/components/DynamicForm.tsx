import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Spin, Empty, message } from 'antd';
import api from '../services/api';
import type { MssqlCustomerClearance } from '../types/mssql';

/** customer_clearance.Inputs JSON에 저장된 필드 정의 */
interface DynamicField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface DynamicFormProps {
  /** 고객명 (customer_clearance 조회 키) */
  customerName: string;
  /** antd Form 인스턴스 */
  form: ReturnType<typeof Form.useForm>[0];
}

/**
 * customer_clearance 테이블의 JSON 설정 기반 동적 폼 렌더링 컴포넌트
 *
 * Inputs 컬럼에 저장된 JSON을 파싱하여 동적으로 Form.Item 생성
 */
const DynamicForm: React.FC<DynamicFormProps> = ({ customerName, form }) => {
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerName) {
      setFields([]);
      return;
    }

    const fetchForm = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<MssqlCustomerClearance>(
          `/api/v1/mssql/customer-forms/${encodeURIComponent(customerName)}`
        );
        if (res.data.inputs) {
          const parsed = JSON.parse(res.data.inputs);
          // JSON이 배열 또는 { fields: [...] } 형식 지원
          const fieldList = Array.isArray(parsed) ? parsed : parsed.fields || [];
          setFields(fieldList);
        } else {
          setFields([]);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setFields([]);
          setError('이 고객에 대한 동적 폼 설정이 없습니다.');
        } else {
          message.error('동적 폼 설정 조회 실패');
          setError('조회 실패');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [customerName]);

  if (loading) {
    return <Spin tip="동적 폼 로딩 중..." style={{ display: 'block', margin: '20px 0' }} />;
  }

  if (error && fields.length === 0) {
    return <Empty description={error} style={{ margin: '20px 0' }} />;
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <>
      {fields.map((field) => (
        <Form.Item
          key={field.name}
          name={['dynamic', field.name]}
          label={field.label || field.name}
          rules={field.required ? [{ required: true, message: `${field.label} 필수` }] : []}
        >
          {field.type === 'select' && field.options ? (
            <Select
              placeholder={field.placeholder || `${field.label} 선택`}
              options={field.options.map((o) => ({ value: o, label: o }))}
            />
          ) : field.type === 'number' ? (
            <InputNumber
              style={{ width: '100%' }}
              placeholder={field.placeholder}
            />
          ) : (
            <Input placeholder={field.placeholder} />
          )}
        </Form.Item>
      ))}
    </>
  );
};

export default DynamicForm;
