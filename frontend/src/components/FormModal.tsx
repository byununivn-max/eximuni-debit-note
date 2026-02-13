import React, { useEffect } from 'react';
import { Modal, Form } from 'antd';
import type { FormInstance } from 'antd';

interface FormModalProps {
  /** 모달 타이틀 */
  title: string;
  /** 모달 열림 여부 */
  open: boolean;
  /** 닫기 핸들러 */
  onCancel: () => void;
  /** 저장 핸들러 — validateFields 성공 후 호출 */
  onOk: (values: any) => Promise<void> | void;
  /** 저장 버튼 텍스트 */
  okText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 모달 너비 */
  width?: number;
  /** 저장 중 로딩 */
  confirmLoading?: boolean;
  /** 초기값 (editing 시 주입) */
  initialValues?: Record<string, any>;
  /** Form 레이아웃 */
  layout?: 'horizontal' | 'vertical' | 'inline';
  /** 외부 Form 인스턴스 (제공 안 하면 내부 생성) */
  form?: FormInstance;
  /** 자식 Form.Item들 */
  children: React.ReactNode;
}

/** Modal + Form + 검증 + 취소/저장 통합 컴포넌트 */
const FormModal: React.FC<FormModalProps> = ({
  title,
  open,
  onCancel,
  onOk,
  okText = '저장',
  cancelText = '취소',
  width = 600,
  confirmLoading = false,
  initialValues,
  layout = 'vertical',
  form: externalForm,
  children,
}) => {
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onOk(values);
    } catch {
      /* 검증 실패 시 Ant Design이 자동 표시 */
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={okText}
      cancelText={cancelText}
      width={width}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form form={form} layout={layout}>
        {children}
      </Form>
    </Modal>
  );
};

export default FormModal;
