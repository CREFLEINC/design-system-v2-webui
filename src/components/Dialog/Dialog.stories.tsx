import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Dialog, type DialogSize } from './Dialog'
import { Button } from '../Button/Button'

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  args: { open: false, onClose: () => {} }
} satisfies Meta<typeof Dialog>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>열기</Button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="설정"
          footer={
            <>
              <Button variant="text" onClick={() => setOpen(false)}>취소</Button>
              <Button variant="filled" onClick={() => setOpen(false)}>확인</Button>
            </>
          }
        >
          알림을 받을 방법을 선택하세요.
        </Dialog>
      </>
    )
  }
}

export const OpenSm: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    useEffect(() => setOpen(true), [])
    return (
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="항목 삭제"
        footer={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>취소</Button>
            <Button variant="filled" onClick={() => setOpen(false)}>삭제</Button>
          </>
        }
      >
        이 항목을 삭제할까요? 이 작업은 되돌릴 수 없습니다.
      </Dialog>
    )
  }
}

export const OpenMd: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    useEffect(() => setOpen(true), [])
    return (
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="알림 설정"
        footer={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>취소</Button>
            <Button variant="filled" onClick={() => setOpen(false)}>저장</Button>
          </>
        }
      >
        알림을 받을 방법과 시간을 선택하세요. 변경 사항은 즉시 적용됩니다.
      </Dialog>
    )
  }
}

export const OpenLg: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    useEffect(() => setOpen(true), [])
    return (
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="이용 약관"
        footer={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>닫기</Button>
            <Button variant="filled" onClick={() => setOpen(false)}>동의</Button>
          </>
        }
      >
        <p>본 약관은 CREFLE 서비스의 이용 조건과 절차를 규정합니다. 서비스를 이용하기 전에 아래 내용을 반드시 확인해 주세요.</p>
        <p>제1조 (목적) 이 약관은 회사가 제공하는 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
        <p>제2조 (정의) 서비스란 회사가 제공하는 모든 기능과 콘텐츠를 의미합니다. 이용자란 이 약관에 따라 회사의 서비스를 이용하는 자를 말합니다.</p>
        <p>제3조 (약관의 효력 및 변경) 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 사전에 공지합니다.</p>
        <p>제4조 (개인정보 보호) 회사는 이용자의 개인정보를 관련 법령에 따라 안전하게 관리하며, 별도의 개인정보 처리방침을 따릅니다.</p>
        <p>제5조 (책임의 한계) 회사는 천재지변 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다. 본문이 길어지면 이 영역만 내부 스크롤됩니다.</p>
      </Dialog>
    )
  }
}

export const ConfirmDestructive: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    useEffect(() => setOpen(true), [])
    return (
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="계정 삭제"
        closeOnBackdropClick={false}
        showCloseButton={false}
        footer={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>취소</Button>
            <Button variant="filled" onClick={() => setOpen(false)}>삭제</Button>
          </>
        }
      >
        계정을 삭제하면 모든 데이터가 영구히 사라집니다. 스크림이나 Escape로는 닫히지 않으며 버튼으로만 진행할 수 있습니다.
      </Dialog>
    )
  }
}

// 사이즈 "매트릭스"는 한 화면에 세 모달을 겹칠 수 없어(top layer는 하나만) 트리거로 하나씩 연다.
export const Matrix: Story = {
  render: () => {
    const [size, setSize] = useState<DialogSize | null>(null)
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        {(['sm', 'md', 'lg'] as const).map((s) => (
          <Button key={s} variant="outlined" onClick={() => setSize(s)}>{s} 열기</Button>
        ))}
        <Dialog
          open={size !== null}
          onClose={() => setSize(null)}
          size={size ?? 'md'}
          title={`${size ?? ''} 다이얼로그`}
          footer={<Button variant="filled" onClick={() => setSize(null)}>확인</Button>}
        >
          {size} 사이즈 패널의 최대 너비를 확인하세요.
        </Dialog>
      </div>
    )
  }
}
