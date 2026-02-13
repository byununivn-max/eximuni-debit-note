import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <Result
      status="403"
      title="403"
      subTitle={t('message.forbidden')}
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {t('button.backToHome')}
        </Button>
      }
    />
  );
};

export default ForbiddenPage;
